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

        // @ts-ignore - Google Identity Services
        google.accounts.id.initialize({
            client_id: clientId,
            callback: this.handleGoogleCallback.bind(this),
            auto_select: false,
        });

        // @ts-ignore
        google.accounts.id.renderButton(
            document.getElementById('googleSignInBtn'),
            {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
            }
        );
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
            if (googleSignInBtn) googleSignInBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
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
