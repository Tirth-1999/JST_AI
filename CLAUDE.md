# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JST AI is a full-stack web application that converts JSON (JavaScript Object Notation) to TOON (Token Optimized Object Notation), helping users reduce token usage when working with LLMs and token-based APIs.

**Tech Stack:**
- **Frontend**: TypeScript + Vite
- **Backend**: Python (FastAPI)
- **Styling**: Modern CSS with CSS variables

**Key Features:**
- Real-time JSON to TOON conversion via Python backend
- Animated token usage metrics with smooth counters
- Support for up to 1M tokens in input
- Copy-to-clipboard functionality
- Modern gradient theme with hover effects and animations
- Responsive design for desktop and mobile

## Development Commands

### Initial Setup
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && pip install -r requirements.txt
```

### Development
```bash
# Run both frontend and backend concurrently
npm run dev

# Or run separately:
npm run dev:frontend  # Starts Vite at http://localhost:5173
npm run dev:backend   # Starts FastAPI at http://localhost:8000
```

### Build for Production
```bash
npm run build
```

### Testing
```bash
# Test TOON conversion (CLI)
node test.js
```

## Architecture

### Project Structure
```
JST_AI/
├── backend/
│   ├── main.py              # FastAPI server & endpoints
│   ├── toon_converter.py    # Python TOON conversion engine
│   ├── requirements.txt     # Python dependencies
│   └── __init__.py
├── src/
│   ├── main.ts             # Frontend TypeScript app logic
│   ├── toonConverter.ts    # TOON conversion (client-side fallback)
│   ├── types.ts            # TypeScript type definitions
│   └── styles.css          # Modern CSS with animations
├── index.html              # Main HTML entry point
├── tsconfig.json           # TypeScript configuration
├── package.json
└── CLAUDE.md
```

### Frontend (TypeScript)

**src/main.ts** - Main application controller:
- Handles user interactions (convert, clear, copy)
- Makes HTTP requests to Python backend via Axios
- Implements animated counter system using `requestAnimationFrame`
- Updates metrics display with easing animations
- Error handling and loading states

**src/toonConverter.ts** - Client-side TOON converter:
- Backup/fallback conversion logic
- Token estimation algorithms
- Can be used for offline mode or testing

**src/types.ts** - TypeScript interfaces:
- `ConversionMetrics` - Token statistics interface
- `ConversionRequest/Response` - API contract types

**src/styles.css** - Modern design system:
- CSS custom properties for theming
- Purple/cyan gradient color scheme
- Smooth transitions and hover effects
- Animated counters, pulse effects, loading spinners
- Responsive grid layout

### Backend (Python/FastAPI)

**backend/main.py** - FastAPI application:
- `POST /convert` - Main conversion endpoint
- `GET /health` - Health check endpoint
- CORS middleware for local development
- Pydantic models for request/response validation

**backend/toon_converter.py** - Core conversion engine:
- `json_to_toon(json_string)` - Main conversion function
- `calculate_metrics()` - Token statistics calculator
- `estimate_tokens()` - Hybrid token estimation algorithm

### TOON Format Specification

TOON optimization strategies:
1. **Simple properties**: `key,value` (no quotes for keys)
2. **Arrays of objects**: Compact table format
   ```
   arrayName[length]{key1,key2,...}
     value1,value2
     value3,value4
   ```
3. **Arrays of primitives**: `key[length],val1,val2,val3`
4. **Nested objects**: Dot notation (`user.name,John`)
5. **String escaping**: CSV-style quoting for values with commas

### Token Estimation Algorithm

Uses a hybrid approach combining:
- **Character-based**: `length / 4` (60% weight)
- **Word-based**: word count + special chars × 0.5 (40% weight)

This provides reasonable approximation without requiring external tokenizer libraries.

## API Endpoints

### POST /convert
Convert JSON to TOON format

**Request:**
```json
{
  "jsonString": "{\"name\": \"Example\", \"value\": 123}"
}
```

**Response:**
```json
{
  "toonOutput": "name,Example\nvalue,123",
  "metrics": {
    "jsonTokens": 15,
    "toonTokens": 8,
    "tokensSaved": 7,
    "reductionPercent": "46.7"
  }
}
```

## Key Constraints

- Maximum input: 1,000,000 tokens
- Backend runs on port 8000
- Frontend dev server on port 5173
- CORS enabled for localhost development
- Metrics animate over 1-1.2 seconds with easing

## Development Notes

- TypeScript strict mode enabled
- FastAPI auto-reloads on file changes in dev mode
- Vite provides hot module replacement (HMR)
- All animations use `requestAnimationFrame` for performance
- Error messages shake on display for visual feedback
