import axios from 'axios';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ConversionMetrics, ConversionResponse } from './types';
import authService from './auth';
import { VisualizationManager } from './visualizations';

const API_URL = 'http://localhost:8000';

// Google Client ID - Replace with your actual client ID
const GOOGLE_CLIENT_ID = '789204737622-np3cmr6pom7948uvhlc99uhud36mpgol.apps.googleusercontent.com';

// Initialize Visualization Manager
const visualizationManager = new VisualizationManager();

// DOM Elements
const jsonInput = document.getElementById('jsonInput') as HTMLTextAreaElement;
const toonOutput = document.getElementById('toonOutput') as HTMLPreElement;
const convertBtn = document.getElementById('convertBtn') as HTMLButtonElement;
const clearInputBtn = document.getElementById('clearInput') as HTMLButtonElement;
const copyOutputBtn = document.getElementById('copyOutput') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const uploadBtn = document.getElementById('uploadBtn') as HTMLButtonElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const fileInfo = document.getElementById('fileInfo') as HTMLDivElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const btnText = document.getElementById('btnText') as HTMLSpanElement;
const btnIcon = document.getElementById('btnIcon') as unknown as SVGElement;
const loadingSpinner = document.getElementById('loadingSpinner') as unknown as SVGElement;

// Slide panel elements
const faqToggle = document.getElementById('faqToggle') as HTMLButtonElement;
const contactToggle = document.getElementById('contactToggle') as HTMLButtonElement;
const faqPanel = document.getElementById('faqPanel') as HTMLDivElement;
const contactPanel = document.getElementById('contactPanel') as HTMLDivElement;
const faqClose = document.getElementById('faqClose') as HTMLButtonElement;
const contactClose = document.getElementById('contactClose') as HTMLButtonElement;
const panelOverlay = document.getElementById('panelOverlay') as HTMLDivElement;

// Success animation
const successOverlay = document.getElementById('successOverlay') as HTMLDivElement;

// Table view elements
const viewToggleBtn = document.getElementById('viewToggleBtn') as HTMLButtonElement;
const tableViewContainer = document.getElementById('tableViewContainer') as HTMLDivElement;
const editorWrapper = document.querySelector('.editor-wrapper') as HTMLDivElement;

let currentDataArray: any[] | null = null;
let isTableView = false;

// Line number elements
const jsonLineNumbers = document.getElementById('jsonLineNumbers') as HTMLDivElement;
const toonLineNumbers = document.getElementById('toonLineNumbers') as HTMLDivElement;

// Mobile redo button
const redoBtn = document.getElementById('redoBtn') as HTMLButtonElement;

// Metric elements
const jsonTokensEl = document.getElementById('jsonTokens') as HTMLSpanElement;
const toonTokensEl = document.getElementById('toonTokens') as HTMLSpanElement;
const tokensSavedEl = document.getElementById('tokensSaved') as HTMLSpanElement;
const reductionPercentEl = document.getElementById('reductionPercent') as HTMLSpanElement;

let currentFileName = '';

// Mobile conversion state management
function isMobileView(): boolean {
    return window.innerWidth <= 1024;
}

function showMobileConversionComplete(): void {
    if (isMobileView()) {
        document.body.classList.add('conversion-complete');
        
        // Smooth scroll to TOON output
        const toonPanel = document.querySelector('.editor-panel:nth-child(2)') as HTMLElement;
        if (toonPanel) {
            setTimeout(() => {
                toonPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}

function resetMobileView(): void {
    if (isMobileView()) {
        document.body.classList.remove('conversion-complete');
        
        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

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

// Slide Panel Management
function openPanel(panel: HTMLDivElement): void {
    panel.classList.add('active');
    panelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePanel(panel: HTMLDivElement): void {
    panel.classList.remove('active');
    panelOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function closeAllPanels(): void {
    faqPanel.classList.remove('active');
    contactPanel.classList.remove('active');
    panelOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Line Numbers Management
function updateLineNumbers(element: HTMLDivElement, lineCount: number): void {
    const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
    element.textContent = numbers || '1';
}

function syncScroll(source: HTMLElement, lineNumbersElement: HTMLElement): void {
    lineNumbersElement.scrollTop = source.scrollTop;
}

// File Upload Handlers
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    currentFileName = file.name;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    try {
        setLoading(true);
        hideError();

        let jsonData: string;
        let detectedFormat: 'json' | 'csv' | 'xlsx' = 'json';

        if (fileExtension === 'json') {
            jsonData = await readFileAsText(file);
            // Validate JSON
            JSON.parse(jsonData);
            detectedFormat = 'json';
        } else if (fileExtension === 'csv') {
            jsonData = await convertCSVtoJSON(file);
            detectedFormat = 'csv';
        } else if (fileExtension === 'xlsx') {
            jsonData = await convertXLSXtoJSON(file);
            detectedFormat = 'xlsx';
        } else {
            throw new Error('Unsupported file type. Please upload JSON, CSV, or XLSX files.');
        }

        jsonInput.value = jsonData;
        const lines = jsonData.split('\n').length;
        updateLineNumbers(jsonLineNumbers, lines);

        showFileInfo(file, detectedFormat);

        // Check if it's an array (from CSV/XLSX) and show table view option
        try {
            const parsed = JSON.parse(jsonData);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                currentDataArray = parsed;
                viewToggleBtn.style.display = 'inline-flex';
            }
        } catch (e) {
            // Not valid JSON array
        }

        // Don't auto-convert - let user click the button or press Ctrl+Enter

    } catch (error) {
        showError((error as Error).message);
    } finally {
        setLoading(false);
        fileInput.value = ''; // Reset file input
    }
});

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

async function convertCSVtoJSON(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const json = JSON.stringify(results.data, null, 2);
                    resolve(json);
                } catch (err) {
                    reject(new Error('Failed to convert CSV to JSON'));
                }
            },
            error: (err) => reject(new Error(`CSV parse error: ${err.message}`))
        });
    });
}

async function convertXLSXtoJSON(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Remove __EMPTY columns
    const cleanedData = jsonData.map((row: any) => {
        const cleanedRow: any = {};
        for (const key in row) {
            if (!key.startsWith('__EMPTY')) {
                cleanedRow[key] = row[key];
            }
        }
        return cleanedRow;
    });

    return JSON.stringify(cleanedData, null, 2);
}

function showFileInfo(file: File, format: string): void {
    const fileSizeKB = (file.size / 1024).toFixed(2);
    const formatBadge = format.toUpperCase();
    fileInfo.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
        </svg>
        <span><strong>${file.name}</strong> (${fileSizeKB} KB) • ${formatBadge} detected</span>
    `;
    fileInfo.style.display = 'flex';
}

// Download Handler
downloadBtn.addEventListener('click', () => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        showError('Please sign in to download files');
        return;
    }

    const content = toonOutput.textContent;

    if (!content || content === 'Your optimized TOON output will appear here...' || content === 'Error occurred during conversion') {
        return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const baseFileName = currentFileName ? currentFileName.replace(/\.[^/.]+$/, '') : 'converted';
    a.href = url;
    a.download = `${baseFileName}_toon.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Visual feedback
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg> Downloaded';
    setTimeout(() => {
        downloadBtn.innerHTML = originalText;
    }, 2000);
});

// Event Listeners
convertBtn.addEventListener('click', handleConvert);
clearInputBtn.addEventListener('click', handleClear);
copyOutputBtn.addEventListener('click', handleCopy);
themeToggle.addEventListener('click', toggleTheme);

// Mobile redo button
if (redoBtn) {
    redoBtn.addEventListener('click', () => {
        resetMobileView();
        jsonInput.focus();
    });
}

// Slide panel event listeners
faqToggle.addEventListener('click', () => openPanel(faqPanel));
contactToggle.addEventListener('click', () => openPanel(contactPanel));
faqClose.addEventListener('click', () => closePanel(faqPanel));
contactClose.addEventListener('click', () => closePanel(contactPanel));
panelOverlay.addEventListener('click', closeAllPanels);

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle') as HTMLButtonElement;
const mobileMenuDropdown = document.getElementById('mobileMenuDropdown') as HTMLDivElement;
const mobileFaqBtn = document.getElementById('mobileFaqBtn') as HTMLButtonElement;
const mobileContactBtn = document.getElementById('mobileContactBtn') as HTMLButtonElement;

if (mobileMenuToggle && mobileMenuDropdown) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuDropdown.classList.toggle('show');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenuToggle.contains(e.target as Node) && !mobileMenuDropdown.contains(e.target as Node)) {
            mobileMenuDropdown.classList.remove('show');
        }
    });

    // Mobile menu item handlers
    if (mobileFaqBtn) {
        mobileFaqBtn.addEventListener('click', () => {
            mobileMenuDropdown.classList.remove('show');
            openPanel(faqPanel);
        });
    }

    if (mobileContactBtn) {
        mobileContactBtn.addEventListener('click', () => {
            mobileMenuDropdown.classList.remove('show');
            openPanel(contactPanel);
        });
    }
}

// User dropdown toggle
const userInfoWrapper = document.querySelector('.user-info-wrapper') as HTMLElement;
const userDropdown = document.getElementById('userDropdown') as HTMLDivElement;
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn') as HTMLButtonElement;

if (userInfoWrapper && userDropdown) {
    userInfoWrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userInfoWrapper.contains(e.target as Node) && !userDropdown.contains(e.target as Node)) {
            userDropdown.classList.remove('show');
        }
    });

    // Logout button handler
    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', async () => {
            userDropdown.classList.remove('show');
            await authService.logout();
        });
    }
}

viewToggleBtn.addEventListener('click', toggleView);jsonInput.addEventListener('input', () => {
    const lines = jsonInput.value.split('\n').length;
    updateLineNumbers(jsonLineNumbers, lines);
});

jsonInput.addEventListener('scroll', () => {
    syncScroll(jsonInput, jsonLineNumbers);
});

toonOutput.addEventListener('scroll', () => {
    syncScroll(toonOutput, toonLineNumbers);
});

jsonInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleConvert();
    }
});

async function handleConvert(): Promise<void> {
    const input = jsonInput.value.trim();

    hideError();

    if (!input) {
        showError('Please enter some JSON to convert');
        return;
    }

    try {
        setLoading(true);

        // Detect if input is CSV format (simple detection)
        let jsonString = input;
        if (detectCSVFormat(input)) {
            try {
                jsonString = await convertPastedCSVtoJSON(input);
                jsonInput.value = jsonString;
                const lines = jsonString.split('\n').length;
                updateLineNumbers(jsonLineNumbers, lines);
                showInfo('CSV format detected and converted to JSON');
            } catch (e) {
                // If CSV conversion fails, try as JSON anyway
            }
        }

        const requestData = { jsonString: jsonString };

        const response = await axios.post<ConversionResponse>(`${API_URL}/convert`, requestData);

        const { toonOutput: toonResult, metrics } = response.data;

        // Apply syntax highlighting to TOON output
        toonOutput.innerHTML = highlightTOON(toonResult);
        const toonLines = toonResult.split('\n').length;
        updateLineNumbers(toonLineNumbers, toonLines);

        animateMetrics(metrics);
        copyOutputBtn.disabled = false;
        
        // Parse and store data for visualizations
        try {
            const parsedData = JSON.parse(jsonString);
            if (Array.isArray(parsedData)) {
                visualizationManager.setData(parsedData);
            } else if (typeof parsedData === 'object' && parsedData !== null) {
                // If it's a single object, wrap it in an array
                visualizationManager.setData([parsedData]);
            }
        } catch (e) {
            console.warn('Could not parse data for visualizations:', e);
        }
        
        // Only enable download button if user is authenticated
        if (authService.isAuthenticated()) {
            downloadBtn.disabled = false;
        } else {
            downloadBtn.disabled = true;
        }

        // Show mobile conversion complete state
        showMobileConversionComplete();

    } catch (error) {
        let errorMsg = 'An error occurred during conversion';
        let errorLine: number | null = null;

        if (axios.isAxiosError(error) && error.response) {
            const detail = error.response.data.detail || 'Conversion failed';
            errorMsg = detail;

            const lineMatch = detail.match(/line (\d+)/i);
            if (lineMatch) {
                errorLine = parseInt(lineMatch[1], 10);
            }
        } else if (error instanceof Error) {
            errorMsg = error.message;
        }

        showError(errorMsg);
        toonOutput.textContent = 'Error occurred during conversion';
        copyOutputBtn.disabled = true;
        downloadBtn.disabled = true;

        if (errorLine !== null) {
            highlightErrorLine(errorLine);
        }
    } finally {
        setLoading(false);
    }
}

function detectCSVFormat(input: string): boolean {
    // Simple CSV detection: has commas, no curly braces, and multiple lines
    const lines = input.trim().split('\n');
    if (lines.length < 2) return false;

    const hasCommas = input.includes(',');
    const hasNoBraces = !input.includes('{') && !input.includes('[');
    const firstLineHasCommas = lines[0].includes(',');

    return hasCommas && hasNoBraces && firstLineHasCommas;
}

async function convertPastedCSVtoJSON(csvText: string): Promise<string> {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const json = JSON.stringify(results.data, null, 2);
                    resolve(json);
                } catch (err) {
                    reject(new Error('Failed to convert CSV to JSON'));
                }
            },
            error: (err: any) => reject(new Error(`CSV parse error: ${err.message}`))
        });
    });
}

function showInfo(message: string): void {
    // Create a temporary info banner
    const infoBanner = document.createElement('div');
    infoBanner.className = 'info-banner';
    infoBanner.textContent = message;
    infoBanner.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        padding: 12px 16px;
        background: var(--accent-primary);
        color: white;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(infoBanner);

    setTimeout(() => {
        infoBanner.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(infoBanner);
        }, 300);
    }, 3000);
}

function highlightErrorLine(line: number): void {
    const lineHeight = 19.2;
    const scrollPosition = (line - 1) * lineHeight;
    jsonInput.scrollTop = scrollPosition - 100;
    jsonInput.focus();
}

function toggleView(): void {
    if (!currentDataArray) return;

    isTableView = !isTableView;

    if (isTableView) {
        // Show table view
        renderTableView(currentDataArray);
        tableViewContainer.style.display = 'block';
        editorWrapper.style.display = 'none';
        viewToggleBtn.textContent = 'JSON';
    } else {
        // Show JSON view
        tableViewContainer.style.display = 'none';
        editorWrapper.style.display = 'flex';
        viewToggleBtn.textContent = 'Table';
    }
}

function renderTableView(data: any[]): void {
    if (data.length === 0) {
        tableViewContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-muted);">No data to display</p>';
        return;
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);

    // Build table HTML
    let tableHTML = '<table class="data-table"><thead><tr>';

    // Add row number column
    tableHTML += '<th>#</th>';

    // Add headers
    keys.forEach(key => {
        tableHTML += `<th>${escapeHtml(key)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // Add data rows
    data.forEach((row, index) => {
        tableHTML += '<tr>';
        tableHTML += `<td style="color: var(--text-muted); font-weight: 600;">${index + 1}</td>`;
        keys.forEach(key => {
            const value = row[key];
            const displayValue = value === null || value === undefined ?
                '<span style="color: var(--text-muted); font-style: italic;">null</span>' :
                escapeHtml(String(value));
            tableHTML += `<td title="${escapeHtml(String(value))}">${displayValue}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    tableViewContainer.innerHTML = tableHTML;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightTOON(toonText: string): string {
    const lines = toonText.split('\n');
    
    // Use darker colors in light theme for better visibility
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = isDarkTheme ? [
        '#4ec9b0', // cyan/teal
        '#dcdcaa', // yellow
        '#ce9178', // orange
        '#9cdcfe', // light blue
        '#c586c0', // purple
        '#569cd6', // blue
        '#b5cea8', // light green
    ] : [
        '#0d9488', // dark teal
        '#ca8a04', // dark yellow/gold
        '#ea580c', // dark orange
        '#0284c7', // dark blue
        '#9333ea', // dark purple
        '#2563eb', // darker blue
        '#16a34a', // dark green
    ];

    return lines.map(line => {
        if (!line.trim()) return '';

        // Match array header: arrayName[length]{key1,key2,...}
        const arrayHeaderMatch = line.match(/^(\w+)\[(\d+)\]\{(.+)\}$/);
        if (arrayHeaderMatch) {
            const [, arrayName, length, keys] = arrayHeaderMatch;
            const keysList = keys.split(',');
            const coloredKeys = keysList.map((key, idx) => {
                const color = colors[idx % colors.length];
                return `<span style="color: ${color}">${escapeHtml(key)}</span>`;
            }).join('<span style="color: var(--text-muted)">,</span>');

            return `<span style="color: #569cd6; font-weight: 600">${escapeHtml(arrayName)}</span><span style="color: var(--text-muted)">[${length}]{</span>${coloredKeys}<span style="color: var(--text-muted)">}</span>`;
        }

        // Match data row with leading spaces
        const dataRowMatch = line.match(/^(\s+)(.+)$/);
        if (dataRowMatch) {
            const [, spaces, content] = dataRowMatch;
            const values = content.split(',');
            const coloredValues = values.map((value, idx) => {
                const color = colors[idx % colors.length];
                // Check if value is in quotes
                if (value.trim().startsWith('"') && value.trim().endsWith('"')) {
                    return `<span style="color: ${color}">${escapeHtml(value)}</span>`;
                }
                // Check if it's a number
                if (!isNaN(Number(value.trim()))) {
                    return `<span style="color: ${color}; font-weight: 500">${escapeHtml(value)}</span>`;
                }
                return `<span style="color: ${color}">${escapeHtml(value)}</span>`;
            }).join('<span style="color: var(--text-muted)">,</span>');

            return spaces + coloredValues;
        }

        // Simple key-value pairs: key,value
        const simpleMatch = line.match(/^([^,]+),(.+)$/);
        if (simpleMatch) {
            const [, key, value] = simpleMatch;
            return `<span style="color: #9cdcfe">${escapeHtml(key)}</span><span style="color: var(--text-muted)">,</span><span style="color: #ce9178">${escapeHtml(value)}</span>`;
        }

        return escapeHtml(line);
    }).join('\n');
}

function handleClear(): void {
    jsonInput.value = '';
    toonOutput.textContent = 'Your optimized TOON output will appear here...';
    updateLineNumbers(jsonLineNumbers, 1);
    updateLineNumbers(toonLineNumbers, 1);
    resetMetrics();
    hideError();
    copyOutputBtn.disabled = true;
    downloadBtn.disabled = true;
    fileInfo.style.display = 'none';
    currentFileName = '';

    // Reset table view
    currentDataArray = null;
    isTableView = false;
    viewToggleBtn.style.display = 'none';
    tableViewContainer.style.display = 'none';
    editorWrapper.style.display = 'flex';

    // Reset mobile view
    resetMobileView();

    jsonInput.focus();
}

async function handleCopy(): Promise<void> {
    // Get plain text from the pre element (strips HTML tags)
    const text = toonOutput.textContent;

    if (text && text !== 'Your optimized TOON output will appear here...' && text !== 'Error occurred during conversion') {
        try {
            await navigator.clipboard.writeText(text);

            const originalText = copyOutputBtn.textContent;
            copyOutputBtn.textContent = 'Copied!';

            setTimeout(() => {
                copyOutputBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            showError('Failed to copy to clipboard');
        }
    }
}

function animateMetrics(metrics: ConversionMetrics): void {
    animateCounter(jsonTokensEl, 0, metrics.jsonTokens, 800);
    animateCounter(toonTokensEl, 0, metrics.toonTokens, 800);
    animateCounter(tokensSavedEl, 0, metrics.tokensSaved, 1000);

    const percentValue = parseFloat(metrics.reductionPercent);
    animateCounter(reductionPercentEl, 0, percentValue, 1000, '%');
}

function animateCounter(
    element: HTMLElement,
    start: number,
    end: number,
    duration: number,
    suffix: string = ''
): void {
    const startTime = performance.now();

    const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(start + (end - start) * easeOutQuart);

        element.textContent = suffix
            ? `${current.toLocaleString()}${suffix}`
            : current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}

function resetMetrics(): void {
    jsonTokensEl.textContent = '0';
    toonTokensEl.textContent = '0';
    tokensSavedEl.textContent = '0';
    reductionPercentEl.textContent = '0%';
}

function showError(message: string): void {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError(): void {
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
}

function setLoading(loading: boolean): void {
    if (loading) {
        convertBtn.disabled = true;
        btnText.textContent = 'Converting...';
        btnIcon.style.display = 'none';
        loadingSpinner.style.display = 'block';
    } else {
        convertBtn.disabled = false;
        btnText.textContent = 'Convert to TOON';
        btnIcon.style.display = 'block';
        loadingSpinner.style.display = 'none';
    }
}

// Contact form elements
const contactForm = document.getElementById('contactForm') as HTMLFormElement;
const submitContactBtn = document.getElementById('submitContactBtn') as HTMLButtonElement;
const submitBtnText = document.getElementById('submitBtnText') as HTMLSpanElement;
const submitBtnIcon = document.getElementById('submitBtnIcon') as unknown as SVGElement;
const submitSpinner = document.getElementById('submitSpinner') as unknown as SVGElement;
const formMessage = document.getElementById('formMessage') as HTMLDivElement;

// Contact form handler
contactForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string || null,
        message: formData.get('message') as string
    };

    try {
        // Set loading state
        submitContactBtn.disabled = true;
        submitBtnText.textContent = 'Sending...';
        submitBtnIcon.style.display = 'none';
        submitSpinner.style.display = 'block';
        formMessage.className = 'form-message';
        formMessage.style.display = 'none';

        const response = await axios.post(`${API_URL}/contact`, data);

        // Show success animation
        showSuccessAnimation();

        // Reset form
        contactForm.reset();

        // Show success message in form
        setTimeout(() => {
            formMessage.textContent = response.data.message;
            formMessage.className = 'form-message success';
        }, 2500);

    } catch (error) {
        let errorMsg = 'Failed to send message. Please try again.';

        if (axios.isAxiosError(error) && error.response) {
            errorMsg = error.response.data.detail || errorMsg;
        }

        formMessage.textContent = errorMsg;
        formMessage.className = 'form-message error';
    } finally {
        // Reset button state
        submitContactBtn.disabled = false;
        submitBtnText.textContent = 'Send Message';
        submitBtnIcon.style.display = 'block';
        submitSpinner.style.display = 'none';
    }
});

// Success Animation
function showSuccessAnimation(): void {
    successOverlay.classList.add('active');
    
    setTimeout(() => {
        successOverlay.classList.remove('active');
        closePanel(contactPanel);
    }, 2000);
}

// ============================================
// AUTH INTEGRATION
// ============================================

// Initialize auth service
async function initAuth() {
    // Initialize Google Sign-In
    authService.initGoogleSignIn(GOOGLE_CLIENT_ID);
    
    // Verify existing token if present
    if (authService.isAuthenticated()) {
        await authService.verifyToken();
    }
    
    // Update UI
    authService.updateUI();
}

// Setup logout button
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        authService.logout();
    });
}

// Ability Mode Modal Handling
const abilityModeBtn = document.getElementById('abilityModeBtn');
const abilityModeModal = document.getElementById('abilityModeModal');
const closeAbilityModal = document.getElementById('closeAbilityModal');
const cancelAbilityMode = document.getElementById('cancelAbilityMode');
const confirmAbilityMode = document.getElementById('confirmAbilityMode') as HTMLButtonElement;
const abilityModeConsent = document.getElementById('abilityModeConsent') as HTMLInputElement;

if (abilityModeBtn) {
    abilityModeBtn.addEventListener('click', () => {
        if (abilityModeModal) abilityModeModal.style.display = 'flex';
    });
}

if (closeAbilityModal) {
    closeAbilityModal.addEventListener('click', () => {
        if (abilityModeModal) abilityModeModal.style.display = 'none';
    });
}

if (cancelAbilityMode) {
    cancelAbilityMode.addEventListener('click', () => {
        if (abilityModeModal) abilityModeModal.style.display = 'none';
        if (abilityModeConsent) abilityModeConsent.checked = false;
    });
}

if (abilityModeConsent) {
    abilityModeConsent.addEventListener('change', () => {
        if (confirmAbilityMode) {
            confirmAbilityMode.disabled = !abilityModeConsent.checked;
        }
    });
}

if (confirmAbilityMode) {
    confirmAbilityMode.addEventListener('click', () => {
        if (abilityModeConsent && abilityModeConsent.checked) {
            // Store consent for permanent and session
            localStorage.setItem('ability_mode_consent', 'true');
            sessionStorage.setItem('ability_mode_session_consent', 'true');
            
            // Close modal
            if (abilityModeModal) {
                abilityModeModal.style.display = 'none';
            }
            
            // Switch to Ability Mode tab
            const abilityTabButton = document.querySelector('[data-tab=\"ability\"]') as HTMLButtonElement;
            const converterTab = document.getElementById('converterTab');
            const abilityTab = document.getElementById('abilityTab');
            
            if (abilityTabButton && converterTab && abilityTab) {
                // Remove active from all tabs
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Activate Ability Mode tab
                abilityTabButton.classList.add('active');
                abilityTab.classList.add('active');
            }
            
            // Show tabs container
            checkAbilityModeAccess();
        }
    });
}

// Close modal on outside click
if (abilityModeModal) {
    abilityModeModal.addEventListener('click', (e) => {
        if (e.target === abilityModeModal) {
            abilityModeModal.style.display = 'none';
            if (abilityModeConsent) abilityModeConsent.checked = false;
        }
    });
}

// Handle window resize to reset mobile state if needed
window.addEventListener('resize', () => {
    // If window is resized to desktop view while in conversion-complete state
    if (!isMobileView() && document.body.classList.contains('conversion-complete')) {
        document.body.classList.remove('conversion-complete');
    }
});

// Initialize
initTheme();
updateLineNumbers(jsonLineNumbers, 1);
initAuth();
updateLineNumbers(toonLineNumbers, 1);
copyOutputBtn.disabled = true;
downloadBtn.disabled = true;

// ============================================
// TAB SYSTEM & ABILITY MODE INTEGRATION
// ============================================

// Import ability mode functions
import { GeminiService } from './geminiService';
import { GEMINI_CONFIG } from './geminiConfig';
import { DataAnalyzer } from './dataAnalysis';

let geminiService: GeminiService | null = null;
let currentJsonData: any = null;

// Initialize Gemini service
function initGeminiService() {
    if (!geminiService) {
        geminiService = new GeminiService(GEMINI_CONFIG);
    }
}

// Tab switching
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const tabsWrapper = document.querySelector('.tabs-wrapper') as HTMLElement;
const authLockOverlay = document.getElementById('authLockOverlay') as HTMLDivElement;
const lockOverlaySignIn = document.getElementById('lockOverlaySignIn') as HTMLButtonElement;
const closeLockOverlay = document.getElementById('closeLockOverlay') as HTMLButtonElement;

// Function to show auth lock overlay
function showAuthLockOverlay() {
    if (authLockOverlay) {
        authLockOverlay.classList.add('show');
    }
}

// Function to hide auth lock overlay
function hideAuthLockOverlay() {
    if (authLockOverlay) {
        authLockOverlay.classList.remove('show');
    }
}

// Close lock overlay handlers
if (closeLockOverlay) {
    closeLockOverlay.addEventListener('click', hideAuthLockOverlay);
}

if (authLockOverlay) {
    authLockOverlay.addEventListener('click', (e) => {
        if (e.target === authLockOverlay) {
            hideAuthLockOverlay();
        }
    });
}

// Lock overlay sign in button
if (lockOverlaySignIn) {
    lockOverlaySignIn.addEventListener('click', () => {
        hideAuthLockOverlay();
        // Trigger the main Google sign-in button
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.click();
        }
    });
}

// Function to update sliding background position
function updateSlidingBackground(activeButton: Element) {
    if (!tabsWrapper) return;
    
    const buttonRect = activeButton.getBoundingClientRect();
    const wrapperRect = tabsWrapper.getBoundingClientRect();
    const leftPosition = buttonRect.left - wrapperRect.left;
    const width = buttonRect.width;
    
    tabsWrapper.style.setProperty('--slider-left', `${leftPosition}px`);
    tabsWrapper.style.setProperty('--slider-width', `${width}px`);
}

// Initialize slider position on first active button
const initialActiveButton = document.querySelector('.tab-button.active');
if (initialActiveButton) {
    updateSlidingBackground(initialActiveButton);
}

// Update slider position on window resize
let resizeTimeout: NodeJS.Timeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const activeButton = document.querySelector('.tab-button.active');
        if (activeButton) {
            updateSlidingBackground(activeButton);
        }
    }, 100);
});

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Check if user is authenticated
        const isAuthenticated = authService.isAuthenticated();
        
        if (!isAuthenticated) {
            // Show lock overlay if not authenticated
            showAuthLockOverlay();
            return;
        }
        
        const tabName = button.getAttribute('data-tab');
        
        // Check if clicking Ability Mode tab
        if (tabName === 'ability') {
            // Check if user has given consent for this session
            const sessionConsent = sessionStorage.getItem('ability_mode_session_consent');
            const permanentConsent = localStorage.getItem('ability_mode_consent');
            
            if (!sessionConsent && permanentConsent !== 'true') {
                // Show consent modal
                const abilityModeModal = document.getElementById('abilityModeModal');
                if (abilityModeModal) {
                    abilityModeModal.style.display = 'flex';
                }
                return; // Don't switch tabs yet
            }
        }
        
        // Remove active from all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active to clicked tab
        button.classList.add('active');
        
        // Update sliding background
        updateSlidingBackground(button);
        
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    });
});

// Ability Mode sub-tabs
const abilityTabBtns = document.querySelectorAll('.ability-tab-btn');
const abilityTabContents = document.querySelectorAll('.ability-tab-content');

abilityTabBtns.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-ability-tab');
        
        abilityTabBtns.forEach(btn => btn.classList.remove('active'));
        abilityTabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        const targetContent = document.getElementById(`${tabName}Content`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    });
});

// Analyze button
const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
const insightsContainer = document.getElementById('insightsContainer') as HTMLDivElement;

analyzeBtn?.addEventListener('click', async () => {
    if (!jsonInput.value.trim()) {
        showError('Please enter some data in the converter first');
        return;
    }

    try {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
            Analyzing...
        `;

        initGeminiService();
        
        // Parse JSON data
        const data = JSON.parse(jsonInput.value);
        currentJsonData = data;
        
        // Analyze data
        const analyzer = new DataAnalyzer(data);
        analyzer.analyze();
        const summary = analyzer.generateSummary();
        
        geminiService!.setDataContext(summary);
        
        // Get insights from Gemini
        const insights = await geminiService!.generateInsights(summary);
        
        // Display insights
        displayInsights(insights);
        
    } catch (error: any) {
        console.error('Analysis error:', error);
        showError(error.message || 'Analysis failed');
        insightsContainer.innerHTML = `
            <div class="insight-card" style="border-color: var(--error-border); background: var(--error-bg);">
                <p style="color: var(--error-text);">❌ ${error.message || 'Failed to analyze data. Please try again.'}</p>
            </div>
        `;
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate AI Insights
        `;
    }
});

function displayInsights(insights: string[]) {
    insightsContainer.innerHTML = '';
    
    insights.forEach((insight, index) => {
        const card = document.createElement('div');
        card.className = 'insight-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <div class="insight-header">
                <div class="insight-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <h3>Insight ${index + 1}</h3>
            </div>
            <div class="insight-content">${formatMarkdown(insight)}</div>
        `;
        insightsContainer.appendChild(card);
    });
}

// Chat functionality
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement;
const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
const sendChatBtn = document.getElementById('sendChatBtn') as HTMLButtonElement;

// Auto-resize textarea
function autoResizeTextarea() {
    if (chatInput) {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
}

chatInput?.addEventListener('input', autoResizeTextarea);

sendChatBtn?.addEventListener('click', sendMessage);
chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    if (!jsonInput.value.trim()) {
        showError('Please enter some data in the converter first');
        return;
    }

    try {
        // Add user message
        addChatMessage('user', message);
        chatInput.value = '';
        chatInput.style.height = 'auto'; // Reset height after sending
        sendChatBtn.disabled = true;

        initGeminiService();

        // Prepare data context if not already set
        if (!currentJsonData) {
            currentJsonData = JSON.parse(jsonInput.value);
            const analyzer = new DataAnalyzer(currentJsonData);
            analyzer.analyze();
            const summary = analyzer.generateSummary();
            geminiService!.setDataContext(summary);
        }

        // Show loading with proper structure
        const loadingId = addChatMessage('ai', 'typing');

        // Get AI response
        const response = await geminiService!.chat(message);

        // Remove loading and add real response
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) loadingMsg.remove();
        
        addChatMessage('ai', response);
        
        // Generate and show suggested questions
        showSuggestedQuestions();

    } catch (error: any) {
        console.error('Chat error:', error);
        showError(error.message || 'Chat failed');
        addChatMessage('ai', `❌ Error: ${error.message || 'Failed to get response'}`);
    } finally {
        sendChatBtn.disabled = false;
    }
}

function addChatMessage(role: 'user' | 'ai', content: string): string {
    const messageId = `msg-${Date.now()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    messageDiv.id = messageId;
    
    const label = role === 'user' ? 'You' : 'AI Assistant';
    const messageClass = role === 'user' ? 'message-user' : 'message-ai';
    
    // Get user avatar if logged in
    const userAvatar = document.getElementById('userAvatar') as HTMLImageElement;
    const userAvatarSrc = userAvatar?.src || '';
    
    const avatarHTML = role === 'user' 
        ? (userAvatarSrc ? `<img src="${userAvatarSrc}" class="chat-avatar" alt="User" />` : `<div class="chat-avatar chat-avatar-default">${label.charAt(0)}</div>`)
        : `<div class="chat-avatar chat-avatar-ai">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>`;
    
    // Handle loading state
    const messageContent = content === 'typing' 
        ? '<div class="loading-dots"><span></span><span></span><span></span></div>'
        : formatMarkdown(content);
    
    messageDiv.innerHTML = `
        ${role === 'ai' ? avatarHTML : ''}
        <div class="${messageClass}">
            <div class="message-label">${label}</div>
            <div class="message-content">${messageContent}</div>
        </div>
        ${role === 'user' ? avatarHTML : ''}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

function showSuggestedQuestions() {
    const suggestedQuestionsDiv = document.getElementById('suggestedQuestions') as HTMLDivElement;
    if (!suggestedQuestionsDiv || !currentJsonData) return;

    // Generate contextual questions based on the data
    const questions = generateSuggestedQuestions();
    
    if (questions.length === 0) {
        suggestedQuestionsDiv.style.display = 'none';
        return;
    }

    suggestedQuestionsDiv.innerHTML = `
        <div class="suggested-questions-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Suggested questions
        </div>
        <div class="question-chips">
            ${questions.map(q => `<button class="question-chip" data-question="${q.replace(/"/g, '&quot;')}">${q}</button>`).join('')}
        </div>
    `;

    suggestedQuestionsDiv.style.display = 'block';

    // Add click handlers
    const chips = suggestedQuestionsDiv.querySelectorAll('.question-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.getAttribute('data-question');
            if (question && chatInput) {
                chatInput.value = question;
                chatInput.focus();
                sendMessage();
            }
        });
    });
}

function generateSuggestedQuestions(): string[] {
    if (!currentJsonData) return [];

    const questions: string[] = [];
    
    try {
        // Get column names
        const data = Array.isArray(currentJsonData) ? currentJsonData : [currentJsonData];
        if (data.length === 0) return [];

        const columns = Object.keys(data[0] || {});
        const numericColumns = columns.filter(col => 
            data.some(row => typeof row[col] === 'number')
        );

        // Generate contextual questions
        if (numericColumns.length > 0) {
            const col = numericColumns[0];
            questions.push(`What is the average ${col}?`);
            if (numericColumns.length > 1) {
                questions.push(`Show correlation between ${numericColumns[0]} and ${numericColumns[1]}`);
            }
        }

        if (columns.length > 0) {
            questions.push(`What are the key patterns in this data?`);
            questions.push(`Summarize the main findings`);
        }

        // Limit to 2 questions
        return questions.slice(0, 2);
    } catch (error) {
        console.error('Error generating questions:', error);
        return [];
    }
}

function formatMarkdown(text: string): string {
    let formatted = text;
    
    // Escape HTML first
    formatted = formatted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Code blocks with language support
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
        const language = lang ? `<span class="code-lang">${lang}</span>` : '';
        return `<div class="code-block">${language}<pre><code>${code.trim()}</code></pre></div>`;
    });
    
    // Column names and data fields (words in quotes or backticks)
    formatted = formatted.replace(/['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g, '<span class="highlight-column">$1</span>');
    
    // Numbers and percentages
    formatted = formatted.replace(/\b(\d+(?:\.\d+)?%?)\b/g, '<span class="highlight-number">$1</span>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Bold with gradient highlight for important terms
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-emphasis">$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Bullet points
    formatted = formatted.replace(/^[•\-*]\s+(.+)$/gm, '<li class="bullet-item">$1</li>');
    
    // Numbered lists
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered-item"><span class="item-number">$1</span>$2</li>');
    
    // Wrap consecutive list items
    formatted = formatted.replace(/(<li class="bullet-item">.*?<\/li>\n?)+/gs, '<ul class="insight-list">$&</ul>');
    formatted = formatted.replace(/(<li class="numbered-item">.*?<\/li>\n?)+/gs, '<ol class="insight-list numbered">$&</ol>');
    
    // Key-value pairs (like "Key: Value")
    formatted = formatted.replace(/^([A-Za-z][A-Za-z\s]+):\s*(.+)$/gm, '<div class="key-value"><span class="key">$1:</span> <span class="value">$2</span></div>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Show tabs always (lock overlay handles unauthenticated access)
function checkAbilityModeAccess() {
    const tabsWrapper = document.getElementById('tabsWrapper');
    
    if (tabsWrapper) {
        // Always show tabs - lock overlay will handle authentication
        tabsWrapper.style.display = 'inline-flex';
    }
}

// Update ability mode access check
setInterval(checkAbilityModeAccess, 1000);
checkAbilityModeAccess();
