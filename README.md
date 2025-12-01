# JST AI - JSON to TOON Converter

A modern full-stack web application that converts JSON to TOON (Token Optimized Object Notation), helping you reduce token usage for LLM APIs and token-based services. Features Google OAuth authentication, user management, and conversion history tracking.

![Tech Stack](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

## 🆕 Recent Major Updates (November 2025)

### Ability Mode (AI-Powered Analytics)
- **NEW Tab**: Dedicated AI Mode for intelligent data analysis
- **Gemini Integration**: Powered by Google's Gemini 2.5 Flash model
- **Authentication Lock**: Elegant lock overlay for unauthenticated users with feature showcase
- **Smart Consent System**: Session-based and permanent consent options

### Enhanced UI/UX
- **Sliding Door Animation**: Beautiful tab switching with animated purple gradient background
- **Theme Toggle Redesign**: Consistent 40x40px sizing with sun/moon icons
- **Responsive Header**: Improved breakpoints (640px, 768px, 1024px) with optimized layouts
- **User Profile Simplification**: Avatar-only display, dropdown for logout
- **Auto-Logout Navigation**: Automatic switch to Converter tab when logging out from AI Mode

### Authentication Improvements
- **Always-Visible Tabs**: Both tabs shown to all users, authentication handled via lock overlay
- **Prevented Stuck States**: Users can't be trapped in AI Mode after logout
- **Lock Screen Features**: Interactive overlay showing AI capabilities before sign-in

## ✨ Features

### Core Functionality
- **Real-time Conversion**: Instantly convert JSON to optimized TOON format via Python backend
- **Multiple Input Formats**: Support for JSON, CSV, XLSX, XLS, and TXT file uploads with auto-detection
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

### Ability Mode (AI Mode) - NEW!
- **Gemini AI Integration**: Powered by Google's Gemini AI for intelligent data analysis
- **Natural Language Queries**: Ask questions about your data in plain English
- **Smart Analytics**: Advanced data insights and pattern recognition
- **Authentication Lock Screen**: Beautiful glassmorphism overlay for unauthenticated users
- **Consent Management**: Session-based and permanent consent options for AI features
- **Seamless Tab Switching**: Automatic redirection to accessible content on logout

#### Sub-Tabs in AI Mode:
1. **Lab**: Generate AI insights about your dataset with one click
2. **Chat**: Interactive chat interface with **Enhanced RAG System**
   - **Conversation History**: Maintains context across multiple messages
   - **Deep Dataset Understanding**: AI has access to comprehensive dataset statistics
   - **User Preference Learning**: Adapts response style based on your interaction patterns
   - **Session Management**: Persistent conversations with automatic cleanup
   - **Smart Context**: References previous questions and answers automatically
   - **Detailed Documentation**: See [RAG_SYSTEM.md](./RAG_SYSTEM.md) for complete technical details
3. **Visualizations**: AI-powered exploratory data analysis (EDA)
   - **Automatic Chart Generation**: AI recommends 4 appropriate visualizations
   - **Smart Analysis**: Gemini analyzes your dataset structure and generates optimal charts
   - **Interactive Charts**: Powered by Plotly for dynamic, responsive visualizations
   - **Chart Types**: Bar charts, line plots, pie charts, scatter plots, and more
   - **Card Flip Interface**: Click charts to see descriptions and analysis on the back
   - **Navigation**: Swipe gestures, arrow keys, or carousel dots for easy browsing
   - **Code Execution**: Backend safely executes Python visualization code
   - **Responsive Design**: Charts adapt to all screen sizes with optimized spacing

### UI/UX Excellence
- **Modern Design**: Glassmorphism effects, gradient buttons, and smooth animations
- **Dark/Light Theme**: Persistent theme toggle with system preference detection (sun/moon icons)
- **Sliding Door Animation**: Smooth 0.6s cubic-bezier tab transitions with purple gradient background
- **Responsive Breakpoints**: Enhanced layouts for mobile (≤640px), large mobile (≤768px), tablet (≤1024px), desktop (>1024px)
- **Smart Authentication Flow**: Lock overlay prevents access to AI features while keeping tabs visible
- **Auto-Logout Protection**: Users automatically switch to Converter tab when logging out from AI Mode
- **Single-Column Mobile Mode**: Streamlined experience with step-by-step conversion flow
- **Slide Panels**: Animated FAQ and Contact sections accessible from header
- **Toast Notifications**: Success and error feedback with auto-dismiss
- **Visual Indicators**: Lock icon on disabled download button with hover tooltip
- **Consistent Icon Sizing**: All header icons fixed at 40x40px across all breakpoints
- **Mobile Optimized**: Icon-only header navigation, hamburger menu, redo button for easy re-conversion
- **Window Resize Handling**: Tab animations recalculate positions dynamically on window resize

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
   
   # Gemini AI Configuration (required for AI Mode features)
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   **Generate SECRET_KEY:**
   ```bash
   openssl rand -hex 32
   ```
   
   **Get Gemini API Key:**
   1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   2. Create a new API key
   3. Add it to `backend/.env`

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
1. **Paste JSON** into the left editor or **upload a file** (JSON/CSV/XLSX/XLS/TXT)
2. Click **"Convert to TOON"** (or press Ctrl/Cmd + Enter)
3. View the optimized output with real-time metrics
4. **Copy** the result to clipboard

### With Google Sign-In (Extra Features)
1. Click **"Sign in with Google"** in the header
2. After signing in, convert your JSON as usual
3. Use the **Download** button to save results as `.txt` files
4. Your session is secure with JWT tokens

### Ability Mode (AI-Powered Analytics) 🤖
1. **Access**: Click the **AI Mode** tab (lightbulb icon with "AI" badge) in the header
2. **Authentication Required**: If not signed in, you'll see a lock screen - click "Sign In" to proceed
3. **Consent**: First-time users see a consent modal explaining AI features and data usage
4. **Upload Data**: Drag & drop or upload JSON, CSV, XLSX, XLS, or TXT files for AI analysis
5. **Natural Language Queries**: Ask questions like:
   - "What patterns do you see in this data?"
   - "Summarize the key insights"
   - "What are the top 5 categories by sales?"
6. **AI Analysis**: Gemini AI processes your data and provides intelligent insights
7. **Interactive Chat**: Continue the conversation to drill deeper into your data
8. **Session Management**: Consent is saved per session or permanently based on your choice

**Note**: Ability Mode features require Google sign-in. If you log out while on the AI tab, you'll automatically switch to the Converter tab.

## 📁 Supported File Formats

The application supports multiple file formats with automatic detection and conversion to JSON before TOON conversion:

### JSON (`.json`)
- Direct parsing and validation
- Must be valid JSON format
- No conversion needed

### CSV (`.csv`)
- Auto-detects comma-separated values
- Converts to array of objects with headers as keys
- Supports type inference (numbers, booleans, strings)

### Excel Files (`.xlsx`, `.xls`)
- Reads the first sheet of the workbook
- Converts to array of objects
- Supports both modern (.xlsx) and legacy (.xls) formats
- Automatically removes empty columns

### Text Files (`.txt`)
- **JSON Text**: If content is valid JSON, parses directly
- **Delimited Data**: Auto-detects delimiter (comma, tab, pipe) and parses as CSV
- **Plain Text**: Wraps content in structured object with metadata:
  - Full text content
  - Line-by-line array
  - Word count
  - Line count

**Note**: All formats are converted to JSON on the frontend before being sent to the backend for TOON conversion.

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
- **TypeScript** - Type-safe JavaScript with strict mode
- **Vite** - Fast build tool with HMR and optimized production builds
- **Axios** - HTTP client for API calls with interceptors
- **Papa Parse** - High-performance CSV parsing
- **XLSX** - Excel file handling (XLS, XLSX, CSV)
- **Plotly.js** - Interactive data visualization library
- **Google Gemini AI SDK** - AI-powered data analysis and insights
- **Modern CSS** - Custom properties, CSS Grid, Flexbox, animations, glassmorphism effects
- **Google OAuth SDK** - Secure authentication flow

### Backend
- **Python 3.14** - Core conversion logic and AI integration
- **FastAPI** - High-performance async API framework with automatic API docs
- **SQLAlchemy 2.0** - SQL toolkit and ORM
- **SQLite** - Lightweight database
- **Authlib** - OAuth 2.0 client
- **python-jose** - JWT tokens
- **httpx** - Async HTTP client
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server
- **Google Gemini AI** - Gemini 2.5 Flash model for AI features (backend-only)
- **Plotly** - Python graphing library for visualization generation
- **Pandas** - Data manipulation and analysis for chart data processing

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

### AI & Visualizations
- `POST /generate-insights` - Generate AI insights about dataset
  ```json
  // Request
  {"data": "[{\"name\":\"Alice\",\"age\":25},{\"name\":\"Bob\",\"age\":30}]"}
  
  // Response
  {
    "insights": [
      "- The dataset contains 2 records with name and age fields",
      "- Ages range from 25 to 30 years old"
    ]
  }
  ```

- `POST /chat` - Interactive AI chat about dataset
  ```json
  // Request
  {
    "data": "[{\"name\":\"Alice\",\"age\":25}]",
    "message": "What is the average age?",
    "conversationHistory": []
  }
  
  // Response
  {
    "response": "The average age is 25 years old."
  }
  ```

- `POST /generate-visualizations` - Generate AI-recommended visualizations
  ```json
  // Request
  {"data": "[{\"name\":\"Alice\",\"age\":25},{\"name\":\"Bob\",\"age\":30}]"}
  
  // Response
  {
    "charts": [
      {
        "type": "bar",
        "title": "Age Distribution",
        "description": "Shows the distribution of ages",
        "code": "import plotly.express as px\n..."
      }
    ]
  }
  ```

- `POST /execute-visualization` - Execute visualization code and return Plotly JSON
  ```json
  // Request
  {
    "code": "import plotly.express as px\n...",
    "data": [{"name": "Alice", "age": 25}]
  }
  
  // Response
  {
    "success": true,
    "data": {
      "data": [...],
      "layout": {...}
    }
  }
  ```

### Other
- `POST /contact` - Send contact form email
- `GET /health` - Health check
- `GET /` - API information


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

- **Google OAuth 2.0** - Industry-standard authentication
- **JWT Tokens** - Secure tokens with 7-day expiration (10,080 minutes)
- **HTTP-Only Sessions** - Secure session management
- **CORS Protection** - Cross-origin request security
- **Environment Variables** - Sensitive data protection with .env files
- **SQL Injection Prevention** - SQLAlchemy ORM with parameterized queries
- **No Password Storage** - OAuth-only authentication (no credentials stored)
- **Authentication Lock Overlay** - Prevents unauthorized access to AI features
- **Auto-Logout Protection** - Automatic tab switching to prevent stuck states
- **Consent Management** - User consent tracking for AI features (session & permanent)
- **Backend-Only API Keys** - Gemini API key stored exclusively on server-side, never exposed to frontend
- **Session Clearing** - Conversion results cleared on login/logout for privacy

## 🎨 Customization

### Theme Colors
Edit CSS variables in `src/styles.css` for both dark and light themes:
```css
:root {
    --accent-primary: #0ea5e9;      /* Sky blue */
    --accent-secondary: #10b981;    /* Emerald green */
    --success-color: #4ec9b0;       /* Teal */
    --purple-primary: #a855f7;      /* Tab animation gradient */
    --purple-secondary: #ec4899;    /* Tab animation gradient end */
    /* ... more colors */
}

:root[data-theme="light"] {
    --bg-primary: #ffffff;
    --text-primary: #1e293b;
    /* ... light theme overrides */
}
```

### Tab Animation Timing
Adjust sliding door animation in `src/styles.css`:
```css
.tabs-wrapper::before {
    transition: all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
    /* Change 0.6s to your preferred duration */
}
```

### Responsive Breakpoints
Modify breakpoints in `src/styles.css`:
```css
/* Mobile: ≤640px */
@media (max-width: 640px) { /* ... */ }

/* Large Mobile: 641-768px */
@media (min-width: 641px) and (max-width: 768px) { /* ... */ }

/* Tablet: 769-1024px */
@media (min-width: 769px) and (max-width: 1024px) { /* ... */ }

/* Desktop: >1024px */
@media (min-width: 1025px) { /* ... */ }
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
- Verify `GOOGLE_CLIENT_ID` matches in `backend/.env` and `src/main.ts`
- Check authorized origins in Google Console
- Clear browser cache and cookies
- Ensure redirect URIs are correctly configured

**AI Mode / Ability Mode not accessible:**
- Verify you're signed in with Google (look for your avatar in header)
- Check that Gemini API key is set in `backend/.env`
- Ensure backend server is running on port 8000
- Check browser console for API errors
- Clear browser local storage and session storage, then reload

**Tabs not visible or not switching:**
- Ensure JavaScript is enabled in your browser
- Check browser console for errors
- Try hard refresh (Ctrl/Cmd + Shift + R)
- Verify `src/main.ts` is properly compiled

**Tab animation not smooth:**
- Check if reduced motion is enabled in system settings
- Try a different browser (Chrome/Firefox/Safari)
- Clear browser cache and reload

**Stuck in AI Mode after logout:**
- This should be fixed automatically - you'll be redirected to Converter tab
- If stuck, manually click the Converter tab
- Clear session storage: `sessionStorage.clear()` in browser console

**Theme toggle not working:**
- Clear localStorage: `localStorage.removeItem('jst-theme')`
- Check for JavaScript errors in console
- Verify CSS variables are loaded in `src/styles.css`

**Lock overlay won't dismiss:**
- Click the "Sign In" button on the lock screen
- If Google sign-in fails, check OAuth configuration
- Try clearing cookies and cache

**Database locked:**
```bash
cd backend
rm jst_ai.db
# Restart server (will recreate database)
```

**Window resize breaks tab animation:**
- The animation should recalculate automatically
- If not, try switching tabs to trigger recalculation
- Check browser console for JavaScript errors

## 📝 Development Notes

### Build Configuration
- **TypeScript strict mode enabled** - Full type safety with `"strict": true`
- **Vite HMR** - Instant hot module replacement during development
- **FastAPI auto-reload** - Automatic server restart on Python file changes
- **ES Modules** - Modern JavaScript module system with tree-shaking

### Code Organization
- **Modular architecture** - Separate files for auth, conversion, AI, styling
- **Type definitions** - Centralized interfaces in `src/types.ts`
- **Service layer pattern** - Backend-only AI service for secure API key management
- **Event-driven UI** - Efficient DOM manipulation with event delegation

### Performance Optimizations
- **CSS animations** - Hardware-accelerated transforms for smooth transitions
- **Debounced window resize** - Prevents excessive tab animation recalculations
- **Lazy loading** - Gemini SDK loaded only when needed
- **Minimal re-renders** - Strategic DOM updates to reduce paint operations

### State Management
- **localStorage** - Theme preference, permanent consent, JWT tokens
- **sessionStorage** - Session-based consent, temporary state
- **JWT tokens** - 7-day expiration (10,080 minutes)
- **Auto-cleanup** - Conversion results cleared on auth state changes

### Browser Compatibility
- **Modern browsers** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **CSS Grid & Flexbox** - Layout with fallbacks
- **ES2020+ features** - Optional chaining, nullish coalescing
- **Web APIs** - File API, Fetch API, LocalStorage API

### Security Best Practices
- **CORS enabled** for local development (`localhost:5173` ↔ `localhost:8000`)
- **Backend-Only API Keys** - All Gemini API calls handled server-side, never exposed to client
- **SQL injection prevention** - Parameterized queries via SQLAlchemy ORM
- **XSS protection** - Sanitized user inputs and proper escaping
- **HTTPS ready** - Production configuration supports secure connections

### Database
- **Auto-initialization** - Database created on first backend run
- **Migration-ready** - Schema changes tracked for future migrations
- **SQLite** - Zero-config development database
- **Production-ready** - Easy PostgreSQL/MySQL migration path

## 🚀 Future Features

### Recently Completed ✅
- [x] Ability Mode (AI-powered analytics)
- [x] Gemini AI integration (backend-only for security)
- [x] AI-powered data visualizations with card flip interface
- [x] Interactive carousel with swipe gestures and navigation
- [x] Authentication lock overlay
- [x] Sliding door tab animations
- [x] Responsive header redesign
- [x] Theme toggle improvements
- [x] Auto-logout navigation protection
- [x] Backend API endpoints for insights and chat

### Planned Features
- [ ] Conversion history page
- [ ] Share conversions via links
- [ ] Export conversion history
- [ ] User dashboard with statistics
- [ ] AI Mode: Multiple AI model support (Claude, GPT-4, etc.)
- [ ] AI Mode: Export AI analysis reports
- [ ] AI Mode: Save and share visualizations
- [ ] Rate limiting per user
- [ ] API key generation for developers
- [ ] Batch conversion support
- [ ] Custom TOON format settings
- [ ] Collaborative workspace features
- [ ] Advanced analytics dashboard

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