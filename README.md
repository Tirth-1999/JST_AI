# JST AI - JSON to TOON Converter

A modern full-stack web application that converts JSON to TOON (Token Optimized Object Notation), helping you reduce token usage for LLM APIs and token-based services. Features Google OAuth authentication, user management, and conversion history tracking.

![Tech Stack](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

## ✨ Features

### Core Functionality
- **Real-time Conversion**: Instantly convert JSON to optimized TOON format via Python backend
- **Multiple Input Formats**: Support for JSON, CSV, and XLSX file uploads with auto-detection
- **Animated Metrics**: Smooth counter animations showing token savings in real-time
- **One-Click Actions**: Copy results (always available), download as .txt files (requires sign-in)
- **Syntax Highlighting**: Color-coded TOON output for better readability
- **Line Numbers**: Synchronized line numbers for both input and output editors

### Authentication & User Management
- **Google OAuth 2.0**: Secure sign-in with Google accounts
- **User Profiles**: Avatar and name display with session management
- **JWT Tokens**: Secure authentication with 7-day token expiration
- **SQLite Database**: Local user data storage with User and Conversion tables
- **Feature Gating**: Download functionality requires authentication, copy is always available
- **Session Management**: Automatic clearing of results on login/logout for security

### UI/UX Excellence
- **Modern Design**: Glassmorphism effects, gradient buttons, and smooth animations
- **Dark/Light Theme**: Persistent theme toggle with system preference detection
- **Responsive Breakpoints**: Optimized layouts for desktop (>1024px), tablet, and mobile (≤1024px)
- **Single-Column Mobile Mode**: Streamlined experience with step-by-step conversion flow
- **Slide Panels**: Animated FAQ and Contact sections accessible from header
- **Toast Notifications**: Success and error feedback with auto-dismiss
- **Visual Indicators**: Lock icon on disabled download button with hover tooltip
- **Mobile Optimized**: Icon-only header navigation, redo button for easy re-conversion

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.14+ (or 3.9+)
- Google OAuth Client ID and Secret (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tirth-1999/JST_AI.git
   cd JST_AI
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment variables**
   
   Create `backend/.env`:
   ```env
   # Email Configuration (optional)
   RESEND_API_KEY=your_resend_api_key
   TO_EMAIL=your_email@example.com
   
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   
   # JWT Configuration
   SECRET_KEY=generate_with_openssl_rand_-hex_32
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   ```

   **Generate SECRET_KEY:**
   ```bash
   openssl rand -hex 32
   ```

5. **Update Google Client ID in frontend**
   
   Edit `src/main.ts` (line 10):
   ```typescript
   const GOOGLE_CLIENT_ID = 'your_google_client_id_here';
   ```

### Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials (Web application)
6. Add authorized origins:
   - `http://localhost:5173`
   - `http://localhost:8000`
7. Add authorized redirect URIs:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:8000/auth/google/callback`

For detailed setup instructions, see `GOOGLE_AUTH_SETUP.md` (generated during setup).

### Development

**Run both frontend and backend:**
```bash
npm run dev
```

This starts:
- Frontend (Vite) at http://localhost:5173
- Backend (FastAPI) at http://localhost:8000

**Or run separately:**
```bash
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - Backend
cd backend
python3 main.py
# or: python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📖 Usage

### For Everyone (No Sign-In Required)
1. **Paste JSON** into the left editor or **upload a file** (JSON/CSV/XLSX)
2. Click **"Convert to TOON"** (or press Ctrl/Cmd + Enter)
3. View the optimized output with real-time metrics
4. **Copy** the result to clipboard

### With Google Sign-In (Extra Features)
1. Click **"Sign in with Google"** in the header
2. After signing in, convert your JSON as usual
3. Use the **Download** button to save results as `.txt` files
4. Your session is secure with JWT tokens

### Mobile Experience (≤1024px screens)
1. See only the JSON input initially
2. After conversion, view TOON output in full screen
3. Use the **"Redo Conversion"** button to return to input
4. Scroll down to see metrics

**Note**: Results are automatically cleared when you sign in or out for your security.

## 🎯 What is TOON?

TOON (Token Optimized Object Notation) is a compact JSON representation designed to minimize token usage while maintaining structure and readability.

### Key Features:
- **CSV-like format** for simple key-value pairs
- **Compact table notation** for arrays of objects
- **Minimal whitespace** and efficient formatting
- **Dot notation** for nested objects

### Example

**JSON Input (86 tokens):**
```json
{
  "name": "Example Project",
  "version": 1,
  "items": [
    {"id": 1, "value": "A"},
    {"id": 2, "value": "B"}
  ]
}
```

**TOON Output (29 tokens):**
```
name,Example Project
version,1
items[2]{id,value}
  1,A
  2,B
```

**Result:** 66.3% token reduction!

## 🛠️ Tech Stack

### Frontend
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool with HMR
- **Axios** - HTTP client for API calls
- **Papa Parse** - CSV parsing
- **XLSX** - Excel file handling
- **Modern CSS** - Custom properties, animations, glassmorphism

### Backend
- **Python 3.14** - Core conversion logic
- **FastAPI** - High-performance async API framework
- **SQLAlchemy 2.0** - SQL toolkit and ORM
- **SQLite** - Lightweight database
- **Authlib** - OAuth 2.0 client
- **python-jose** - JWT tokens
- **httpx** - Async HTTP client
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

## 📡 API Endpoints

### Authentication
- `GET /auth/google/login` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `POST /auth/google/verify` - Verify Google ID token
- `GET /auth/me` - Get current user info (protected)

### Conversion
- `POST /convert` - Convert JSON to TOON
  ```json
  // Request
  {"jsonString": "{\"name\": \"Example\"}"}
  
  // Response
  {
    "toonOutput": "name,Example",
    "metrics": {
      "jsonTokens": 15,
      "toonTokens": 8,
      "tokensSaved": 7,
      "reductionPercent": "46.7"
    }
  }
  ```

### Other
- `POST /contact` - Send contact form email
- `GET /health` - Health check
- `GET /` - API information

## 📂 Project Structure

```
JST_AI/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── auth.py              # OAuth & JWT logic
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # Database configuration
│   ├── toon_converter.py    # TOON conversion engine
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables (not in git)
│   └── jst_ai.db           # SQLite database (not in git)
├── src/
│   ├── main.ts             # Frontend application logic
│   ├── auth.ts             # Authentication service
│   ├── toonConverter.ts    # Client-side conversion
│   ├── types.ts            # TypeScript types
│   └── styles.css          # Modern CSS styling
├── public/
│   └── logo.svg            # Application logo
├── index.html              # Main HTML
├── image.png               # Logo image
├── example.json            # Sample JSON file
├── tsconfig.json           # TypeScript config
├── package.json            # NPM dependencies
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `google_id` - Google user ID (unique)
- `email` - User email (unique)
- `name` - User full name
- `picture` - Profile picture URL
- `created_at` - Account creation timestamp
- `last_login` - Last login timestamp
- `is_active` - Account status

### Conversions Table (Ready for future features)
- `id` - Primary key
- `user_id` - Foreign key to users
- `title` - Conversion name
- `json_input` - Original JSON
- `toon_output` - Converted TOON
- `json_tokens` - Token count
- `toon_tokens` - Optimized token count
- `tokens_saved` - Tokens saved
- `reduction_percent` - Reduction percentage
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## 🔐 Security Features

- Google OAuth 2.0 authentication
- JWT tokens with expiration
- HTTP-only session management
- CORS protection
- Environment variable protection
- SQL injection prevention (SQLAlchemy ORM)
- No password storage (OAuth only)

## 🎨 Customization

### Theme Colors
Edit CSS variables in `src/styles.css`:
```css
:root {
    --accent-primary: #0ea5e9;
    --accent-secondary: #10b981;
    --success-color: #4ec9b0;
    /* ... more colors */
}
```

### Token Calculation
Modify `backend/toon_converter.py` to adjust token counting logic.

## 🐛 Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
cd backend && pip install -r requirements.txt
```

**"Port already in use":**
```bash
# Kill processes on ports
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Google Sign-In not working:**
- Verify `GOOGLE_CLIENT_ID` matches in `.env` and `main.ts`
- Check authorized origins in Google Console
- Clear browser cache and cookies

**Database locked:**
```bash
cd backend
rm jst_ai.db
# Restart server (will recreate database)
```

## 📝 Development Notes

- TypeScript strict mode enabled
- FastAPI auto-reloads on file changes
- Vite provides instant HMR
- Database auto-creates on first run
- JWT tokens expire after 7 days
- CORS enabled for local development

## 🚀 Future Features

- [ ] Conversion history page
- [ ] Share conversions via links
- [ ] Export conversion history
- [ ] User dashboard with statistics
- [ ] Rate limiting per user
- [ ] API key generation for developers
- [ ] Batch conversion support
- [ ] Custom TOON format settings

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

**Tirth Shah**
- GitHub: [@Tirth-1999](https://github.com/Tirth-1999)
- LinkedIn: [Tirth Chirayu Shah](https://www.linkedin.com/in/tirth-chirayu-shah/)
- Portfolio: [tirthcshah.me](https://tirthcshah.me/)

## 🙏 Acknowledgments

- FastAPI for the excellent async framework
- Google for OAuth 2.0 authentication
- Vite for blazing fast development
- SQLAlchemy for powerful ORM

---

Made with ❤️ by Tirth Shah