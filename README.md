# JST AI - JSON to TOON Converter

A modern full-stack web application that converts JSON to TOON (Token Optimized Object Notation), helping you reduce token usage for LLM APIs and token-based services.

![Tech Stack](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## Features

- **Real-time Conversion**: Instantly convert JSON to optimized TOON format via Python backend
- **Animated Metrics**: Smooth counter animations showing token savings
- **Large File Support**: Handle up to 1M tokens of input
- **Modern UI**: Beautiful gradient theme with purple/cyan colors, hover effects, and animations
- **One-Click Copy**: Copy TOON output to clipboard instantly
- **Responsive Design**: Works seamlessly on desktop and mobile

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
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
npm run dev:backend
```

### Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

1. Paste your JSON into the left input area
2. Click **"Convert to TOON"** button (or press Ctrl/Cmd + Enter)
3. View the optimized TOON output on the right
4. Watch the animated metrics showing your token savings
5. Click **"Copy"** to copy the TOON output to clipboard

## What is TOON?

TOON (Token Optimized Object Notation) is a compact JSON representation designed to minimize token usage while maintaining structure and readability. It achieves this through:

- **CSV-like format** for simple key-value pairs
- **Compact table notation** for arrays of objects
- **Minimal whitespace** and efficient formatting
- **Dot notation** for nested objects

### Example

**JSON Input:**
```json
{
  "name": "Example",
  "version": 1,
  "items": [
    {"id": 1, "value": "A"},
    {"id": 2, "value": "B"}
  ]
}
```

**TOON Output:**
```
name,Example
version,1
items[2]{id,value}
  1,A
  2,B
```

**Result:** 65.8% token reduction!

## Tech Stack

### Frontend
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool with HMR
- **Axios** - HTTP client for API calls
- **Modern CSS** - Custom properties, animations, gradients

### Backend
- **Python** - Core conversion logic
- **FastAPI** - High-performance async API framework
- **Pydantic** - Data validation using Python type hints
- **Uvicorn** - ASGI server

## API Endpoints

### `POST /convert`
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

### `GET /health`
Health check endpoint

## Project Structure

```
JST_AI/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── toon_converter.py    # TOON conversion engine
│   └── requirements.txt
├── src/
│   ├── main.ts             # Frontend application logic
│   ├── toonConverter.ts    # Client-side conversion
│   ├── types.ts            # TypeScript types
│   └── styles.css          # Modern CSS styling
├── index.html              # Main HTML
├── tsconfig.json           # TypeScript config
└── package.json
```

## Development Notes

- TypeScript strict mode enabled
- FastAPI auto-reloads on file changes
- Vite provides instant HMR
- Animated metrics use `requestAnimationFrame` for smooth 60fps
- CORS enabled for local development
