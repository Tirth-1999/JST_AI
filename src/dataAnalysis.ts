// Data Analysis Utilities

export interface DataStats {
    rowCount: number;
    columnCount: number;
    columns: ColumnInfo[];
    numericalStats: Record<string, NumericalStats>;
    categoricalStats: Record<string, CategoricalStats>;
    nullCounts: Record<string, number>;
}

export interface ColumnInfo {
    name: string;
    type: 'numerical' | 'categorical' | 'mixed';
    nullCount: number;
    uniqueCount: number;
}

export interface NumericalStats {
    mean: number;
    median: number;
    mode: number[];
    min: number;
    max: number;
    std: number;
    q1: number;
    q3: number;
    iqr: number;
}

export interface CategoricalStats {
    uniqueCount: number;
    topValues: Array<{ value: any; count: number; percentage: number }>;
    mode: any[];
}

export class DataAnalyzer {
    private data: any[];

    constructor(data: any[]) {
        this.data = data;
    }

    analyze(): DataStats {
        if (!Array.isArray(this.data) || this.data.length === 0) {
            throw new Error('Invalid data: must be a non-empty array');
        }

        const columns = this.getColumns();
        const rowCount = this.data.length;
        const columnCount = columns.length;

        const columnInfo: ColumnInfo[] = [];
        const numericalStats: Record<string, NumericalStats> = {};
        const categoricalStats: Record<string, CategoricalStats> = {};
        const nullCounts: Record<string, number> = {};

        for (const column of columns) {
            const values = this.data.map(row => row[column]);
            const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
            const uniqueCount = new Set(values.filter(v => v !== null && v !== undefined && v !== '')).size;

            const columnType = this.inferColumnType(values);
            
            columnInfo.push({
                name: column,
                type: columnType,
                nullCount,
                uniqueCount
            });

            nullCounts[column] = nullCount;

            if (columnType === 'numerical') {
                numericalStats[column] = this.calculateNumericalStats(values);
            } else if (columnType === 'categorical') {
                categoricalStats[column] = this.calculateCategoricalStats(values);
            }
        }

        return {
            rowCount,
            columnCount,
            columns: columnInfo,
            numericalStats,
            categoricalStats,
            nullCounts
        };
    }

    private getColumns(): string[] {
        if (this.data.length === 0) return [];
        const firstRow = this.data[0];
        return Object.keys(firstRow);
    }

    private inferColumnType(values: any[]): 'numerical' | 'categorical' | 'mixed' {
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
        if (nonNullValues.length === 0) return 'categorical';

        const numericalCount = nonNullValues.filter(v => typeof v === 'number' || !isNaN(Number(v))).length;
        const percentage = numericalCount / nonNullValues.length;

        if (percentage > 0.8) return 'numerical';
        if (percentage < 0.2) return 'categorical';
        return 'mixed';
    }

    private calculateNumericalStats(values: any[]): NumericalStats {
        const numbers = values
            .filter(v => v !== null && v !== undefined && v !== '')
            .map(v => typeof v === 'number' ? v : Number(v))
            .filter(v => !isNaN(v));

        if (numbers.length === 0) {
            return {
                mean: 0, median: 0, mode: [], min: 0, max: 0,
                std: 0, q1: 0, q3: 0, iqr: 0
            };
        }

        const sorted = [...numbers].sort((a, b) => a - b);
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const median = this.calculateMedian(sorted);
        const mode = this.calculateMode(numbers);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const std = this.calculateStd(numbers, mean);
        const q1 = this.calculatePercentile(sorted, 25);
        const q3 = this.calculatePercentile(sorted, 75);
        const iqr = q3 - q1;

        return { mean, median, mode, min, max, std, q1, q3, iqr };
    }

    private calculateCategoricalStats(values: any[]): CategoricalStats {
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
        const uniqueCount = new Set(nonNullValues).size;

        // Count occurrences
        const counts: Record<string, number> = {};
        for (const value of nonNullValues) {
            const key = String(value);
            counts[key] = (counts[key] || 0) + 1;
        }

        // Get top values
        const topValues = Object.entries(counts)
            .map(([value, count]) => ({
                value,
                count,
                percentage: (count / nonNullValues.length) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate mode
        const maxCount = Math.max(...Object.values(counts));
        const mode = Object.entries(counts)
            .filter(([, count]) => count === maxCount)
            .map(([value]) => value);

        return { uniqueCount, topValues, mode };
    }

    private calculateMedian(sorted: number[]): number {
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return sorted[mid];
    }

    private calculatePercentile(sorted: number[], percentile: number): number {
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        
        if (lower === upper) return sorted[lower];
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }

    private calculateMode(numbers: number[]): number[] {
        const counts: Record<number, number> = {};
        for (const num of numbers) {
            counts[num] = (counts[num] || 0) + 1;
        }

        const maxCount = Math.max(...Object.values(counts));
        return Object.entries(counts)
            .filter(([, count]) => count === maxCount)
            .map(([value]) => Number(value));
    }

    private calculateStd(numbers: number[], mean: number): number {
        const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
        return Math.sqrt(variance);
    }

    // Generate summary text for AI
    generateSummary(): string {
        const stats = this.analyze();
        let summary = `Dataset Overview:\n`;
        summary += `- Total Rows: ${stats.rowCount}\n`;
        summary += `- Total Columns: ${stats.columnCount}\n\n`;

        summary += `Columns:\n`;
        for (const col of stats.columns) {
            summary += `- ${col.name} (${col.type}): ${col.uniqueCount} unique values, ${col.nullCount} nulls\n`;
        }

        summary += `\nNumerical Statistics:\n`;
        for (const [col, numStats] of Object.entries(stats.numericalStats)) {
            summary += `- ${col}:\n`;
            summary += `  Mean: ${numStats.mean.toFixed(2)}, Median: ${numStats.median.toFixed(2)}\n`;
            summary += `  Min: ${numStats.min.toFixed(2)}, Max: ${numStats.max.toFixed(2)}\n`;
            summary += `  Std Dev: ${numStats.std.toFixed(2)}\n`;
        }

        summary += `\nCategorical Statistics:\n`;
        for (const [col, catStats] of Object.entries(stats.categoricalStats)) {
            summary += `- ${col}: ${catStats.uniqueCount} unique values\n`;
            summary += `  Top values: ${catStats.topValues.slice(0, 3).map(v => `${v.value} (${v.count})`).join(', ')}\n`;
        }

        return summary;
    }

    // Export full statistics for enhanced AI context
    exportFullStats(): any {
        const stats = this.analyze();
        return {
            ...stats,
            raw_data: this.data.slice(0, 5) // Include first 5 rows as samples
        };
    }
}
