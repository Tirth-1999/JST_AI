// Gemini AI Service

export interface GeminiConfig {
    apiKey: string;
    model?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: string;
}

export interface ChatHistory {
    messages: ChatMessage[];
    context?: string;
}

export class GeminiService {
    private apiKey: string;
    private model: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    private chatHistory: ChatMessage[] = [];
    private dataContext: string = '';

    constructor(config: GeminiConfig) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'gemini-2.5-flash';
    }

    // Set data context for the conversation
    setDataContext(context: string) {
        this.dataContext = context;
    }

    // Generate content with Gemini
    async generateContent(prompt: string): Promise<string> {
        try {
            const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to generate content');
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                throw new Error('No response from AI');
            }

            return text;
        } catch (error: any) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }

    // Chat with context
    async chat(userMessage: string): Promise<string> {
        try {
            // Build context-aware prompt
            let fullPrompt = '';
            
            if (this.dataContext && this.chatHistory.length === 0) {
                fullPrompt = `You are a helpful data analyst assistant. Here is the data context:\n\n${this.dataContext}\n\nUser Question: ${userMessage}\n\nProvide a clear, concise answer based on the data provided. If you need to calculate something, show your work.`;
            } else if (this.dataContext) {
                fullPrompt = `Based on the previous conversation and data context, answer this question:\n\n${userMessage}`;
            } else {
                fullPrompt = userMessage;
            }

            const response = await this.generateContent(fullPrompt);
            
            // Update chat history
            this.chatHistory.push({ role: 'user', parts: userMessage });
            this.chatHistory.push({ role: 'model', parts: response });

            return response;
        } catch (error) {
            console.error('Chat error:', error);
            throw error;
        }
    }

    // Generate data visualization code
    async generateVisualization(data: any[], analysisType: string): Promise<string> {
        const prompt = `Given this dataset structure and the analysis type "${analysisType}", generate HTML/CSS/JavaScript code to create an appropriate visualization.

Dataset sample (first 3 rows):
${JSON.stringify(data.slice(0, 3), null, 2)}

Total rows: ${data.length}

Requirements:
1. Use plain JavaScript (no external libraries required)
2. Create a responsive SVG or Canvas visualization
3. Include proper labels, axes, and legends
4. Use a clean, modern design with colors that work on dark backgrounds
5. Return ONLY the HTML code that can be directly inserted into a div

Generate the visualization code:`;

        return await this.generateContent(prompt);
    }

    // Generate insights from data analysis
    async generateInsights(dataStats: any): Promise<string[]> {
        const prompt = `Analyze this dataset statistics and provide 5-7 key insights in a bullet-point format:

${JSON.stringify(dataStats, null, 2)}

Focus on:
1. Data quality issues (nulls, outliers)
2. Statistical patterns
3. Correlations or interesting relationships
4. Recommendations for further analysis

Format: Return as a JSON array of strings, each being one insight.`;

        const response = await this.generateContent(prompt);
        
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // If no JSON found, split by newlines
            return response
                .split('\n')
                .filter(line => line.trim().length > 0)
                .slice(0, 7);
        } catch (e) {
            return [response];
        }
    }

    // Answer specific data questions
    async answerDataQuestion(question: string, data: any[]): Promise<string> {
        const dataSample = data.slice(0, 5);
        const prompt = `Given this dataset (showing first 5 rows):

${JSON.stringify(dataSample, null, 2)}

Total rows: ${data.length}
Columns: ${Object.keys(data[0] || {}).join(', ')}

User Question: ${question}

Provide a clear, accurate answer. If calculation is needed, perform it and show the result. Be concise and specific.`;

        return await this.generateContent(prompt);
    }

    // Clear chat history
    clearHistory() {
        this.chatHistory = [];
        this.dataContext = '';
    }

    // Get chat history
    getHistory(): ChatMessage[] {
        return this.chatHistory;
    }
}
