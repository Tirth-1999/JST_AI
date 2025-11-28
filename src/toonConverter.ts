/**
 * TOON (Token Optimized Object Notation) Converter
 * Converts JSON to a CSV-like token-efficient format
 *
 * Format:
 * - Simple properties: key,value
 * - Arrays of objects: arrayName[length]{key1,key2,...}
 *   followed by rows of values
 * - Nested objects: expanded with dot notation or inline
 */

import type { ConversionMetrics } from './types';

export function jsonToToon(jsonString: string): string {
    try {
        const obj = JSON.parse(jsonString);
        return convertToToon(obj, '');
    } catch (error) {
        throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
}

function convertToToon(obj: any, prefix: string = ''): string {
    if (obj === null || obj === undefined) {
        return '';
    }

    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
            lines.push(`${fullKey},null`);
        } else if (typeof value === 'boolean') {
            lines.push(`${fullKey},${value}`);
        } else if (typeof value === 'number') {
            lines.push(`${fullKey},${value}`);
        } else if (typeof value === 'string') {
            const escapedValue = escapeValue(value);
            lines.push(`${fullKey},${escapedValue}`);
        } else if (Array.isArray(value)) {
            if (value.length === 0) {
                lines.push(`${fullKey}[0]`);
            } else if (isArrayOfObjects(value)) {
                lines.push(formatObjectArray(fullKey, value));
            } else if (isArrayOfPrimitives(value)) {
                const values = value.map(v =>
                    typeof v === 'string' ? escapeValue(v) : String(v)
                ).join(',');
                lines.push(`${fullKey}[${value.length}],${values}`);
            } else {
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        lines.push(convertToToon(item, `${fullKey}[${index}]`));
                    } else {
                        const val = typeof item === 'string' ? escapeValue(item) : String(item);
                        lines.push(`${fullKey}[${index}],${val}`);
                    }
                });
            }
        } else if (typeof value === 'object') {
            lines.push(convertToToon(value, fullKey));
        }
    }

    return lines.filter(line => line).join('\n');
}

function formatObjectArray(key: string, array: any[]): string {
    if (array.length === 0) return `${key}[0]`;

    const allKeys = new Set<string>();
    array.forEach(obj => {
        Object.keys(obj).forEach(k => allKeys.add(k));
    });
    const keys = Array.from(allKeys);

    const header = `${key}[${array.length}]{${keys.join(',')}}`;

    const rows = array.map(obj => {
        return keys.map(k => {
            const value = obj[k];
            if (value === null || value === undefined) return 'null';
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') return escapeValue(value);
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        }).join(',');
    });

    return [header, ...rows.map(row => '  ' + row)].join('\n');
}

function isArrayOfObjects(arr: any[]): boolean {
    if (arr.length === 0) return false;
    return arr.every(item =>
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item)
    );
}

function isArrayOfPrimitives(arr: any[]): boolean {
    if (arr.length === 0) return false;
    return arr.every(item =>
        item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
    );
}

function escapeValue(value: string): string {
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

export function estimateTokens(text: string): number {
    if (!text) return 0;

    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const specialChars = (text.match(/[{}[\]:,\n]/g) || []).length;

    const charBasedEstimate = charCount / 4;
    const wordBasedEstimate = wordCount + specialChars * 0.5;

    return Math.round((charBasedEstimate * 0.6 + wordBasedEstimate * 0.4));
}

export function calculateMetrics(jsonString: string, toonString: string): ConversionMetrics {
    const jsonTokens = estimateTokens(jsonString);
    const toonTokens = estimateTokens(toonString);
    const tokensSaved = jsonTokens - toonTokens;
    const reductionPercent = jsonTokens > 0
        ? ((tokensSaved / jsonTokens) * 100).toFixed(1)
        : '0';

    return {
        jsonTokens,
        toonTokens,
        tokensSaved,
        reductionPercent
    };
}

export function validateTokenLimit(text: string, maxTokens: number = 1000000): number {
    const tokens = estimateTokens(text);
    if (tokens > maxTokens) {
        throw new Error(`Input exceeds maximum token limit of ${maxTokens.toLocaleString()}. Current: ${tokens.toLocaleString()}`);
    }
    return tokens;
}
