export interface ConversionMetrics {
    jsonTokens: number;
    toonTokens: number;
    tokensSaved: number;
    reductionPercent: string;
}

export interface ConversionRequest {
    jsonString: string;
}

export interface ConversionResponse {
    toonOutput: string;
    metrics: ConversionMetrics;
}
