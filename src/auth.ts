import axios from 'axios';

const API_URL = 'http://localhost:8000';

interface User {
    id: number;
    email: string;
    name: string;
    picture?: string;
    created_at: string;
}

interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

class AuthService {
    private token: string | null = null;
    private user: User | null = null;
    private tokenClient: any = null;
    // @ts-ignore - stored for potential future use
    private clientId: string = '';

    constructor() {
        // Load token from localStorage on init
        this.token = localStorage.getItem('jst_token');
        const userData = localStorage.getItem('jst_user');
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (e) {
                console.error('Failed to parse user data', e);
            }
        }
    }

    // Initialize Google Sign-In
    initGoogleSignIn(clientId: string) {
        if (!clientId || clientId === 'your_google_client_id_here') {
            console.warn('Google Client ID not configured');
            return;
        }

        this.clientId = clientId;

        // Check if Google Identity Services is loaded
        // @ts-ignore
        if (typeof google === 'undefined' || !google.accounts) {
            console.error('Google Identity Services not loaded');
            // Retry after a short delay
            setTimeout(() => this.initGoogleSignIn(clientId), 500);
            return;
        }

        try {
            // Initialize for ID token flow (for backend verification)
            // @ts-ignore - Google Identity Services
            google.accounts.id.initialize({
                client_id: clientId,
                callback: this.handleGoogleCallback.bind(this),
                auto_select: false,
            });

            // Also initialize the OAuth2 token client for button clicks
            // @ts-ignore
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'email profile openid',
                callback: async (response: any) => {
                    console.log('OAuth token received:', response);
                    if (response.access_token) {
                        // Use the access token to get user info
                        await this.getUserInfoWithToken(response.access_token);
                    }
                },
            });

            // Setup custom button click handler
            this.setupCustomButton();
            
            console.log('Google Sign-In initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Google Sign-In:', error);
        }
    }

    // Get user info using OAuth access token
    async getUserInfoWithToken(accessToken: string) {
        try {
            console.log('Fetching user info with access token');
            // Get user info from Google
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const userInfo = await userInfoResponse.json();
            console.log('User info received:', userInfo);

            // Send to backend for verification and JWT creation
            const payload = {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                sub: userInfo.sub, // Google user ID
            };
            console.log('Sending to backend:', payload);
            
            const result = await axios.post<AuthResponse>(`${API_URL}/auth/google/verify`, payload);

            this.token = result.data.access_token;
            this.user = result.data.user;

            // Store in localStorage
            localStorage.setItem('jst_token', this.token);
            localStorage.setItem('jst_user', JSON.stringify(this.user));

            // Update UI
            this.updateUI();
            this.clearConversionResults();
            this.showNotification('Successfully signed in!', 'success');
        } catch (error: any) {
            console.error('Failed to get user info:', error);
            console.error('Error response:', error.response?.data);
            this.showNotification('Sign-in failed. Please try again.', 'error');
        }
    }

    // Setup custom Google Sign-In button
    setupCustomButton() {
        const googleBtn = document.getElementById('googleSignInBtn');
        if (!googleBtn) {
            console.warn('Google sign-in button not found');
            return;
        }

        googleBtn.addEventListener('click', () => {
            console.log('Sign-in button clicked, requesting access token');
            try {
                // Use the token client to request access (this opens the popup)
                if (this.tokenClient) {
                    this.tokenClient.requestAccessToken();
                } else {
                    console.error('Token client not initialized');
                    this.showNotification('Sign-in not ready. Please refresh the page.', 'error');
                }
            } catch (error) {
                console.error('Error triggering Google Sign-In:', error);
                this.showNotification('Sign-in error. Please check browser console.', 'error');
            }
        });
    }

    // Render or re-render Google Sign-In button with current theme
    renderGoogleButton() {
        // No longer needed - using custom button
        // Keeping method for compatibility
    }

    // Handle Google Sign-In callback
    async handleGoogleCallback(response: any) {
        try {
            const result = await axios.post<AuthResponse>(`${API_URL}/auth/google/verify`, {
                credential: response.credential,
            });

            this.token = result.data.access_token;
            this.user = result.data.user;

            // Store in localStorage
            localStorage.setItem('jst_token', this.token);
            localStorage.setItem('jst_user', JSON.stringify(this.user));

            // Update UI
            this.updateUI();

            // Clear conversion results on login
            this.clearConversionResults();

            // Show success notification
            this.showNotification('Successfully signed in!', 'success');
        } catch (error) {
            console.error('Authentication failed:', error);
            this.showNotification('Sign-in failed. Please try again.', 'error');
        }
    }

    // Logout
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('jst_token');
        localStorage.removeItem('jst_user');
        
        // @ts-ignore
        if (window.google?.accounts?.id) {
            // @ts-ignore
            google.accounts.id.disableAutoSelect();
        }
        
        // Clear conversion results on logout
        this.clearConversionResults();
        
        // Switch to converter tab if on ability mode
        const converterTab = document.querySelector('.tab-button[data-tab="converter"]') as HTMLElement;
        const abilityTab = document.querySelector('.tab-button[data-tab="ability"]') as HTMLElement;
        const converterContent = document.getElementById('converterTab');
        const abilityContent = document.getElementById('abilityTab');
        
        if (abilityTab?.classList.contains('active')) {
            // Remove active from ability tab
            abilityTab.classList.remove('active');
            if (abilityContent) {
                abilityContent.classList.remove('active');
            }
            
            // Add active to converter tab
            if (converterTab) {
                converterTab.classList.add('active');
            }
            if (converterContent) {
                converterContent.classList.add('active');
            }
            
            // Update sliding background if available
            const tabsWrapper = document.querySelector('.tabs-wrapper') as HTMLElement;
            if (tabsWrapper && converterTab) {
                const buttonRect = converterTab.getBoundingClientRect();
                const wrapperRect = tabsWrapper.getBoundingClientRect();
                const leftPosition = buttonRect.left - wrapperRect.left;
                const width = buttonRect.width;
                
                tabsWrapper.style.setProperty('--slider-left', `${leftPosition}px`);
                tabsWrapper.style.setProperty('--slider-width', `${width}px`);
            }
        }
        
        this.updateUI();
        this.showNotification('Logged out successfully', 'success');
    }

    // Get current user
    getUser(): User | null {
        return this.user;
    }

    // Get auth token
    getToken(): string | null {
        return this.token;
    }

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return this.token !== null && this.user !== null;
    }

    // Update UI based on auth state
    updateUI() {
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar') as HTMLImageElement;
        const userName = document.getElementById('userName');

        if (this.isAuthenticated() && this.user) {
            // Hide sign-in button, show profile
            if (googleSignInBtn) googleSignInBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userAvatar && this.user.picture) userAvatar.src = this.user.picture;
            if (userName) userName.textContent = this.user.name;
        } else {
            // Show sign-in button, hide profile
            if (googleSignInBtn) googleSignInBtn.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
        }

        // Update download button visibility
        this.updateDownloadButtonVisibility();
    }

    // Update download button visibility based on auth state
    updateDownloadButtonVisibility() {
        const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
        
        if (downloadBtn) {
            if (this.isAuthenticated()) {
                downloadBtn.setAttribute('data-authenticated', 'true');
            } else {
                downloadBtn.removeAttribute('data-authenticated');
            }
        }
    }

    // Verify token with backend
    async verifyToken(): Promise<boolean> {
        if (!this.token) return false;

        try {
            const response = await axios.get<User>(`${API_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
            });

            this.user = response.data;
            localStorage.setItem('jst_user', JSON.stringify(this.user));
            return true;
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
            return false;
        }
    }

    // Get axios config with auth header
    getAuthHeader() {
        return {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        };
    }

    // Clear conversion results
    clearConversionResults() {
        const toonOutput = document.getElementById('toonOutput') as HTMLPreElement;
        const copyOutputBtn = document.getElementById('copyOutput') as HTMLButtonElement;
        const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
        const toonLineNumbers = document.getElementById('toonLineNumbers') as HTMLDivElement;
        
        if (toonOutput) {
            toonOutput.textContent = 'Your optimized TOON output will appear here...';
        }
        
        if (copyOutputBtn) {
            copyOutputBtn.disabled = true;
        }
        
        if (downloadBtn) {
            downloadBtn.disabled = true;
        }

        // Reset line numbers
        if (toonLineNumbers) {
            toonLineNumbers.textContent = '1';
        }

        // Reset metrics to initial state
        this.resetMetrics();

        // Reset mobile view if in conversion-complete state
        if (document.body.classList.contains('conversion-complete')) {
            document.body.classList.remove('conversion-complete');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Reset metrics to zero
    resetMetrics() {
        const jsonTokensEl = document.getElementById('jsonTokens');
        const toonTokensEl = document.getElementById('toonTokens');
        const tokensSavedEl = document.getElementById('tokensSaved');
        const reductionPercentEl = document.getElementById('reductionPercent');

        if (jsonTokensEl) jsonTokensEl.textContent = '0';
        if (toonTokensEl) toonTokensEl.textContent = '0';
        if (tokensSavedEl) tokensSavedEl.textContent = '0';
        if (reductionPercentEl) reductionPercentEl.textContent = '0%';
    }

    // Show notification
    private showNotification(message: string, type: 'success' | 'error') {
        // You can integrate this with your existing notification system
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
