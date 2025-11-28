import axios from 'axios';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ConversionMetrics, ConversionResponse } from './types';

const API_URL = 'http://localhost:8000';

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

// Metric elements
const jsonTokensEl = document.getElementById('jsonTokens') as HTMLSpanElement;
const toonTokensEl = document.getElementById('toonTokens') as HTMLSpanElement;
const tokensSavedEl = document.getElementById('tokensSaved') as HTMLSpanElement;
const reductionPercentEl = document.getElementById('reductionPercent') as HTMLSpanElement;

let currentFileName = '';

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

// Slide panel event listeners
faqToggle.addEventListener('click', () => openPanel(faqPanel));
contactToggle.addEventListener('click', () => openPanel(contactPanel));
faqClose.addEventListener('click', () => closePanel(faqPanel));
contactClose.addEventListener('click', () => closePanel(contactPanel));
panelOverlay.addEventListener('click', closeAllPanels);

viewToggleBtn.addEventListener('click', toggleView);

jsonInput.addEventListener('input', () => {
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
        downloadBtn.disabled = false;

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
    const colors = [
        '#4ec9b0', // cyan/teal
        '#dcdcaa', // yellow
        '#ce9178', // orange
        '#9cdcfe', // light blue
        '#c586c0', // purple
        '#569cd6', // blue
        '#b5cea8', // light green
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

// Initialize
initTheme();
updateLineNumbers(jsonLineNumbers, 1);
updateLineNumbers(toonLineNumbers, 1);
copyOutputBtn.disabled = true;
downloadBtn.disabled = true;
