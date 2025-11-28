# JST AI - JSON to TOON Converter

A modern full-stack web application that converts JSON to TOON (Token Optimized Object Notation), helping you reduce token usage for LLM APIs and token-based services. Features Google OAuth authentication, user management, and conversion history tracking.

![Tech Stack](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

## ✨ Features

### Core Functionality
- **Real-time Conversion**: Instantly convert JSON to optimized TOON format
- **Multiple Input Formats**: Support for JSON, CSV, and XLSX file uploads
- **Animated Metrics**: Smooth counter animations showing token savings
- **One-Click Actions**: Copy, download, and clear functionality
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Authentication & User Management
- **Google OAuth 2.0**: Secure sign-in with Google accounts
- **User Profiles**: Avatar and name display with session management
- **JWT Tokens**: Secure authentication with 7-day token expiration
- **SQLite Database**: Local user data storage

### UI/UX
- **Modern Design**: Glassmorphism effects and smooth animations
- **Dark/Light Theme**: Persistent theme toggle with system preference detection
- **Slide Panels**: FAQ and Contact sections with smooth animations
- **Toast Notifications**: Success and error feedback
- **Mobile Optimized**: Icon-only navigation on small screens

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

1. **Sign in** with your Google account (optional, for saving history)
2. **Paste JSON** into the left editor or **upload a file** (JSON/CSV/XLSX)
3. Click **"Convert to TOON"** (or press Ctrl/Cmd + Enter)
4. View the optimized output and metrics
5. **Copy** or **Download** the result
6. View **FAQ** for more information or **Contact** for support

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