// Gemini API Configuration Template
// Copy this file to geminiConfig.ts and add your API key

export const GEMINI_CONFIG = {
    apiKey: '', // Add your Gemini API key here
    model: 'gemini-2.5-flash'
};

// Instructions:
// 1. Get your free Gemini API key from: https://aistudio.google.com/app/apikey
// 2. Copy this file: cp src/geminiConfig.example.ts src/geminiConfig.ts
// 3. Edit geminiConfig.ts and replace the empty string with your API key
// 4. Save the file
// 5. The Ability Mode will now work with Gemini AI
// 6. IMPORTANT: Never commit geminiConfig.ts - it's in .gitignore

// Security Note:
// The geminiConfig.ts file is listed in .gitignore to prevent accidentally
// committing your API key to version control. Always use environment variables
// or gitignored config files for sensitive credentials.
