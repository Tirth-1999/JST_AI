import { DataAnalyzer, DataStats } from './dataAnalysis';
import { GeminiService } from './geminiService';
import { GEMINI_CONFIG } from './geminiConfig';

// Global state
let currentData: any[] = [];
let dataStats: DataStats | null = null;
let geminiService: GeminiService;
let userInfo: any = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    initializeGemini();
    setupEventListeners();
    initTabs();
});

// Theme Management
function initTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Authentication Check
function checkAuth(): void {
    const token = localStorage.getItem('jst_token');
    const userData = localStorage.getItem('jst_user');
    const abilityConsent = localStorage.getItem('ability_mode_consent');

    if (!token || !userData || abilityConsent !== 'true') {
        // Redirect back to main page if not authorized
        window.location.href = '/';
        return;
    }

    try {
        userInfo = JSON.parse(userData);
        updateUserProfile();
    } catch (e) {
        console.error('Failed to parse user data', e);
        window.location.href = '/';
    }
}

function updateUserProfile(): void {
    const userAvatar = document.getElementById('userAvatar') as HTMLImageElement;
    const userName = document.getElementById('userName');

    if (userInfo) {
        if (userAvatar && userInfo.picture) userAvatar.src = userInfo.picture;
        if (userName) userName.textContent = userInfo.name;
    }
}

// Initialize Gemini
function initializeGemini(): void {
    geminiService = new GeminiService({ apiKey: GEMINI_CONFIG.apiKey });
}

// Setup Event Listeners
function setupEventListeners(): void {
    // Back button
    const backBtn = document.getElementById('backToMain');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Upload button
    const uploadBtn = document.getElementById('uploadDataBtn');
    const fileInput = document.getElementById('dataFileInput') as HTMLInputElement;
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Data input textarea
    const dataInput = document.getElementById('dataInput') as HTMLTextAreaElement;
    if (dataInput) {
        dataInput.addEventListener('input', handleDataInput);
    }

    // Analyze button
    const analyzeBtn = document.getElementById('analyzeDataBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeData);
    }

    // Chat input
    const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('sendChatBtn') as HTMLButtonElement;
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            if (sendBtn) {
                sendBtn.disabled = !chatInput.value.trim() || currentData.length === 0;
            }
            // Auto-resize
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        });
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (sendBtn && !sendBtn.disabled) {
                    sendChatMessage();
                }
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessage);
    }

    // Query suggestions
    const suggestions = document.querySelectorAll('.query-suggestion');
    suggestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.textContent?.replace(/['"]/g, '') || '';
            if (chatInput) chatInput.value = query;
            sendChatMessage();
        });
    });
}

// Tab System
function initTabs(): void {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const indicator = document.querySelector('.tab-indicator') as HTMLElement;

    if (!indicator || tabBtns.length === 0) return;

    // Set initial indicator position
    updateIndicator(tabBtns[0] as HTMLElement);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            if (!tab) return;

            // Update active states
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const tabContent = document.getElementById(`${tab}Tab`);
            if (tabContent) tabContent.classList.add('active');

            // Update indicator
            updateIndicator(btn as HTMLElement);
        });
    });
}

function updateIndicator(btn: HTMLElement): void {
    const indicator = document.querySelector('.tab-indicator') as HTMLElement;
    if (!indicator) return;

    const rect = btn.getBoundingClientRect();
    const container = btn.parentElement?.getBoundingClientRect();
    
    if (container) {
        indicator.style.width = `${rect.width}px`;
        indicator.style.left = `${rect.left - container.left}px`;
    }
}

// File Upload Handler
async function handleFileUpload(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    showLoading('Reading file...');

    try {
        const text = await file.text();
        let data: any[];

        if (file.name.endsWith('.json')) {
            data = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
            data = parseCSV(text);
        } else {
            throw new Error('Unsupported file format');
        }

        if (!Array.isArray(data)) {
            data = [data];
        }

        currentData = data;
        const dataInput = document.getElementById('dataInput') as HTMLTextAreaElement;
        if (dataInput) {
            dataInput.value = JSON.stringify(data, null, 2);
        }

        updateDataStats();
        hideLoading();
        showNotification('File loaded successfully!', 'success');
    } catch (error: any) {
        hideLoading();
        showNotification(`Error reading file: ${error.message}`, 'error');
    }

    input.value = '';
}

// Data Input Handler
function handleDataInput(e: Event): void {
    const input = e.target as HTMLTextAreaElement;
    const value = input.value.trim();

    if (!value) {
        currentData = [];
        updateDataStats();
        return;
    }

    try {
        const data = JSON.parse(value);
        currentData = Array.isArray(data) ? data : [data];
        updateDataStats();
    } catch (e) {
        // Invalid JSON, don't update
    }
}

// Update Data Stats Display
function updateDataStats(): void {
    const statsDiv = document.getElementById('dataStats');
    const rowCount = document.getElementById('rowCount');
    const colCount = document.getElementById('colCount');
    const dataStatus = document.getElementById('dataStatus');
    const analyzeBtn = document.getElementById('analyzeDataBtn') as HTMLButtonElement;
    const sendBtn = document.getElementById('sendChatBtn') as HTMLButtonElement;

    if (currentData.length > 0) {
        if (statsDiv) statsDiv.style.display = 'flex';
        if (rowCount) rowCount.textContent = currentData.length.toString();
        if (colCount) colCount.textContent = Object.keys(currentData[0] || {}).length.toString();
        if (dataStatus) {
            dataStatus.textContent = 'Ready';
            dataStatus.className = 'stat-value stat-ready';
        }
        if (analyzeBtn) analyzeBtn.disabled = false;
        if (sendBtn) {
            const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
            sendBtn.disabled = !chatInput?.value.trim();
        }
    } else {
        if (statsDiv) statsDiv.style.display = 'none';
        if (analyzeBtn) analyzeBtn.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
    }
}

// Analyze Data with AI
async function analyzeData(): Promise<void> {
    if (currentData.length === 0) return;

    showLoading('Analyzing data with AI...');

    try {
        // Perform statistical analysis
        const analyzer = new DataAnalyzer(currentData);
        dataStats = analyzer.analyze();
        
        // Set context for Gemini
        const summary = analyzer.generateSummary();
        geminiService.setDataContext(summary);

        // Generate insights
        const insights = await geminiService.generateInsights(dataStats);

        // Display results in Lab tab
        displayLabResults(dataStats, insights);

        // Switch to Lab tab
        const labBtn = document.querySelector('[data-tab="lab"]') as HTMLElement;
        if (labBtn) labBtn.click();

        hideLoading();
        showNotification('Analysis complete!', 'success');
    } catch (error: any) {
        hideLoading();
        showNotification(`Analysis failed: ${error.message}`, 'error');
    }
}

// Display Lab Results
function displayLabResults(stats: DataStats, insights: string[]): void {
    const labResults = document.getElementById('labResults');
    const labPlaceholder = document.querySelector('.lab-placeholder') as HTMLElement;
    const statsOverview = document.getElementById('statsOverview');

    if (labPlaceholder) labPlaceholder.style.display = 'none';
    if (labResults) labResults.style.display = 'block';

    // Display stats overview
    if (statsOverview) {
        statsOverview.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-title">Total Rows</div>
                <div class="stat-card-value">${stats.rowCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Total Columns</div>
                <div class="stat-card-value">${stats.columnCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Numerical Columns</div>
                <div class="stat-card-value">${Object.keys(stats.numericalStats).length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Categorical Columns</div>
                <div class="stat-card-value">${Object.keys(stats.categoricalStats).length}</div>
            </div>
        `;
    }

    // Display insights
    const visualizations = document.getElementById('visualizations');
    if (visualizations && insights.length > 0) {
        let insightsHTML = '<div class="visualization-card"><div class="visualization-title">🔍 Key Insights</div><ul class="insights-list">';
        insights.forEach(insight => {
            insightsHTML += `<li>${insight}</li>`;
        });
        insightsHTML += '</ul></div>';
        visualizations.innerHTML = insightsHTML;
    }
}

// Send Chat Message
async function sendChatMessage(): Promise<void> {
    const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
    const message = chatInput.value.trim();
    
    if (!message || currentData.length === 0) return;

    // Add user message to chat
    addChatMessage(message, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Hide welcome message
    const welcome = document.querySelector('.chat-welcome') as HTMLElement;
    if (welcome) welcome.style.display = 'none';

    showLoading('Thinking...');

    try {
        // Get AI response
        const response = await geminiService.chat(message);
        hideLoading();
        addChatMessage(response, 'ai');
    } catch (error: any) {
        hideLoading();
        addChatMessage(`Sorry, I encountered an error: ${error.message}`, 'ai');
    }
}

// Add Chat Message
function addChatMessage(message: string, sender: 'user' | 'ai'): void {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = sender === 'user' ? (userInfo?.name?.[0] || 'U') : '🤖';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = message;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// CSV Parser
function parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
            const value = values[index];
            // Try to parse as number
            row[header] = isNaN(Number(value)) ? value : Number(value);
        });
        
        data.push(row);
    }

    return data;
}

// Loading Overlay
function showLoading(text: string = 'Processing...'): void {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay) overlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = text;
}

function hideLoading(): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Notification
function showNotification(message: string, type: 'success' | 'error'): void {
    // Reuse the notification system from main page
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '16px 24px';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '10001';
    notification.style.animation = 'slideIn 0.3s ease';
    notification.style.background = type === 'success' ? '#10b981' : '#ef4444';
    notification.style.color = 'white';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
