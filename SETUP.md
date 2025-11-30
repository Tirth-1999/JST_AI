# 🚀 Quick Setup Guide - After Security Fix

## What Changed?

For security reasons, API keys are no longer included in the repository. You need to configure them manually.

## Setup Steps (5 minutes):

### 1. Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your credentials:

```bash
# Get Gemini API key (FREE): https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_actual_gemini_key

# Get Resend API key: https://resend.com/api-keys  
RESEND_API_KEY=your_resend_key
TO_EMAIL=your-email@example.com

# Generate JWT secret:
# python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your_generated_secret_key

# Google OAuth (optional for login feature):
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. Frontend Configuration

```bash
cd src
cp geminiConfig.example.ts geminiConfig.ts
```

Edit `src/geminiConfig.ts`:

```typescript
export const GEMINI_CONFIG = {
    apiKey: 'your_actual_gemini_key_here', // Same as backend
    model: 'gemini-2.5-flash'
};
```

### 3. Install & Run

```bash
# Install dependencies
npm install
cd backend && pip install -r requirements.txt

# Run backend (terminal 1)
cd backend
python3 -m uvicorn main:app --reload --port 8000

# Run frontend (terminal 2)
npm run dev
```

### 4. Verify Everything Works

1. Open http://localhost:5173
2. Go to Ability Mode → Visualizations tab
3. Upload data and click "Generate Visualizations"
4. If charts appear, you're all set! ✅

## Free API Keys:

- **Gemini AI**: https://aistudio.google.com/app/apikey (FREE, generous limits)
- **Resend**: https://resend.com/signup (FREE tier: 100 emails/day)
- **Google OAuth**: https://console.cloud.google.com/ (FREE, for login feature)

## Need Help?

- API keys not working? Double-check you copied them correctly (no extra spaces)
- Still getting errors? Check backend terminal for detailed error messages
- Can't generate visualizations? Make sure backend is running on port 8000

## Security Reminder:

- ✅ `backend/.env` is gitignored (safe to add keys)
- ✅ `src/geminiConfig.ts` is gitignored (safe to add keys)  
- ❌ Never remove files from `.gitignore`
- ❌ Never commit API keys to Git

Enjoy building! 🎉
