from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
import json
import os
from dotenv import load_dotenv
import resend
import httpx
import asyncio

from toon_converter import json_to_toon, calculate_metrics
from database import engine, get_db
import models
from auth import oauth, create_access_token, get_current_user, get_or_create_user
import re

# Load environment variables
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="JST AI - JSON to TOON Converter API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConversionRequest(BaseModel):
    jsonString: str


class ConversionMetrics(BaseModel):
    jsonTokens: int
    toonTokens: int
    tokensSaved: int
    reductionPercent: str


class ConversionResponse(BaseModel):
    toonOutput: str
    metrics: ConversionMetrics


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str


class ContactResponse(BaseModel):
    success: bool
    message: str


class VisualizationRequest(BaseModel):
    data: str  # JSON string of the data


class ChartData(BaseModel):
    type: str  # 'bar', 'line', 'pie', 'scatter'
    title: str
    description: str
    code: str  # Python code to generate the chart


class VisualizationResponse(BaseModel):
    charts: List[ChartData]


class InsightsRequest(BaseModel):
    summary: str  # Data summary from frontend


class InsightsResponse(BaseModel):
    insights: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None  # Data context/summary


class ChatResponse(BaseModel):
    response: str


class TxtParseRequest(BaseModel):
    text: str
    preview_only: bool = False  # If true, only analyze a sample


class DelimiterInfo(BaseModel):
    delimiter: str
    delimiter_name: str
    confidence: float
    has_header: bool
    column_count: int
    sample_rows: List[List[str]]


class TxtConvertRequest(BaseModel):
    text: str
    delimiter: Optional[str] = None  # If None, auto-detect
    has_header: Optional[bool] = None  # If None, auto-detect
    preview_lines: int = 200  # For large files, only show preview


class TxtConvertResponse(BaseModel):
    json_data: str
    delimiter_used: str
    has_header: bool
    total_rows: int
    is_preview: bool  # True if file was too large and we're showing preview


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    name: str
    picture: Optional[str] = None
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ============================================
# AUTH ENDPOINTS
# ============================================

@app.get("/auth/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth login"""
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        # Get or create user
        user = get_or_create_user(
            db=db,
            google_id=user_info['sub'],
            email=user_info['email'],
            name=user_info.get('name', ''),
            picture=user_info.get('picture', '')
        )
        
        # Create JWT token
        access_token = create_access_token(data={"sub": user.id})
        
        # Redirect to frontend with token
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/auth/success?token={access_token}")
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")


@app.post("/auth/google/verify")
async def google_verify(request: Request, db: Session = Depends(get_db)):
    """Verify Google ID token from frontend or accept user info from OAuth"""
    try:
        body = await request.json()
        print(f"Received auth request with body: {body}")
        
        id_token = body.get("credential")
        
        # Check if we received user info directly (from OAuth2 token flow)
        if not id_token and body.get("email"):
            print(f"Received user info directly: {body.get('email')}")
            # User info was sent directly from OAuth2 token flow
            user = get_or_create_user(
                db=db,
                google_id=body.get('sub'),
                email=body['email'],
                name=body.get('name', ''),
                picture=body.get('picture', '')
            )
            
            # Create JWT token
            access_token = create_access_token(data={"sub": user.id})
            
            return AuthResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserResponse(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    picture=user.picture,
                    created_at=user.created_at.isoformat()
                )
            )
        
        if not id_token:
            print(f"ERROR: No credential or user info provided. Body keys: {body.keys()}")
            raise HTTPException(status_code=400, detail="No credential or user info provided")
        
        print(f"Verifying Google ID token")
        # Verify the Google ID token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid token")
            
            user_info = response.json()
            
            # Verify the token is for our app
            client_id = os.getenv("GOOGLE_CLIENT_ID")
            if user_info.get('aud') != client_id:
                raise HTTPException(status_code=400, detail="Token not for this application")
            
            # Get or create user
            user = get_or_create_user(
                db=db,
                google_id=user_info['sub'],
                email=user_info['email'],
                name=user_info.get('name', ''),
                picture=user_info.get('picture', '')
            )
            
            # Create JWT token
            access_token = create_access_token(data={"sub": user.id})
            
            return AuthResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserResponse(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    picture=user.picture,
                    created_at=user.created_at.isoformat()
                )
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        created_at=current_user.created_at.isoformat()
    )


# ============================================
# MAIN ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {
        "message": "JST AI - JSON to TOON Converter API",
        "version": "1.0.0",
        "endpoints": {
            "/convert": "POST - Convert JSON to TOON",
            "/health": "GET - Health check"
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/convert", response_model=ConversionResponse)
async def convert_json_to_toon(request: ConversionRequest):
    try:
        # Validate JSON
        try:
            json.loads(request.jsonString)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")

        # Convert to TOON
        toon_output = json_to_toon(request.jsonString)

        # Calculate metrics
        metrics = calculate_metrics(request.jsonString, toon_output)

        return ConversionResponse(
            toonOutput=toon_output,
            metrics=ConversionMetrics(**metrics)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


@app.post("/contact", response_model=ContactResponse)
async def send_contact_email(request: ContactRequest):
    try:
        # Get API key from environment
        api_key = os.getenv("RESEND_API_KEY")
        to_email = os.getenv("TO_EMAIL", "tirth.shah@tamu.edu")

        if not api_key:
            raise HTTPException(status_code=500, detail="Email service not configured")

        # Set Resend API key
        resend.api_key = api_key

        # Create email HTML template
        phone_row = f'''
        <tr>
            <td style="padding: 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="width: 100px; font-weight: 600; color: #4ec9b0;">Phone:</td>
                        <td style="color: #d4d4d4;">{request.phone}</td>
                    </tr>
                </table>
            </td>
        </tr>''' if request.phone else ""

        html_content = f'''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:linear-gradient(135deg,#1e1e1e 0%,#2d2d30 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#252526;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4)">
<tr><td style="background:linear-gradient(135deg,#0ea5e9 0%,#10b981 100%);padding:40px 30px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:28px;font-weight:700">📬 New Contact Message</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px">From JSON to TOON Tool</p>
</td></tr>
<tr><td style="padding:30px">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="width:100px;font-weight:600;color:#4ec9b0">From:</td>
<td style="color:#d4d4d4;font-weight:500">{request.name}</td>
</tr></table></td></tr>
<tr><td style="padding:8px 0"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="width:100px;font-weight:600;color:#4ec9b0">Email:</td>
<td><a href="mailto:{request.email}" style="color:#0ea5e9;text-decoration:none;font-weight:500">{request.email}</a></td>
</tr></table></td></tr>
{phone_row}
<tr><td style="padding:20px 0 8px"><table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-weight:600;color:#4ec9b0;padding-bottom:12px">Message:</td></tr>
<tr><td style="background:#1e1e1e;border:1px solid #3e3e42;border-radius:8px;padding:20px;color:#d4d4d4;line-height:1.6;white-space:pre-wrap">{request.message}</td></tr>
</table></td></tr>
<tr><td style="padding:20px 0;text-align:center">
<a href="mailto:{request.email}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9 0%,#10b981 100%);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600">Reply to {request.name}</a>
</td></tr>
</table>
</td></tr>
<tr><td style="background:#1e1e1e;padding:20px 30px;border-top:1px solid #3e3e42;text-align:center">
<p style="margin:0;color:#9d9d9d;font-size:12px">Sent from JSON to TOON Tool</p>
</td></tr>
</table>
</body>
</html>'''

        # Send email using Resend
        params = {
            "from": "JSON to TOON Tool <onboarding@resend.dev>",
            "to": [to_email],
            "reply_to": [request.email],
            "subject": f"Contact Form: Message from {request.name}",
            "html": html_content
        }

        resend.Emails.send(params)

        return ContactResponse(
            success=True,
            message="Thank you for your message! I'll get back to you soon."
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@app.post("/generate-visualizations", response_model=VisualizationResponse)
async def generate_visualizations(request: VisualizationRequest):
    """Generate visualization recommendations using Gemini AI"""
    try:
        # Validate JSON
        try:
            data = json.loads(request.data)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")

        # Prepare prompt for Gemini
        prompt = f"""
Generate 4 simple visualizations. Use proper pandas methods for aggregations.

RULES:
- Simple charts (bar/line/pie/scatter)
- ONE clear insight per chart
- For counts: use df['column'].value_counts()
- For numeric data: use df directly
- Always assign result to 'fig' variable
- End with: fig.to_json()

Data sample:
{json.dumps(data[:2] if isinstance(data, list) and len(data) > 2 else data)}

Columns: {list(data[0].keys()) if isinstance(data, list) and len(data) > 0 else 'N/A'}

EXAMPLES:
1. Count categories: df['Species'].value_counts().reset_index() then px.bar
2. Numeric scatter: px.scatter(df, x='col1', y='col2')
3. Simple line: px.line(df, x='date', y='value')

Return JSON (no markdown):
{{
  "charts": [
    {{
      "type": "bar",
      "title": "Short Title",
      "description": "Brief insight.",
      "code": "import plotly.express as px\\nimport pandas as pd\\ndf=pd.DataFrame(data)\\ncounts=df['col'].value_counts().reset_index()\\ncounts.columns=['col','count']\\nfig=px.bar(counts,x='col',y='count',title='Title')\\nfig.to_json()"
    }}
  ]
}}
"""

        # Call Gemini API
        gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_api_key:
            raise HTTPException(status_code=500, detail="Gemini API not configured. Please add GEMINI_API_KEY to your .env file")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}",
                json={
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }],
                    "generationConfig": {
                        "temperature": 0.5,
                        "maxOutputTokens": 8192,
                    }
                }
            )

            if response.status_code != 200:
                error_detail = response.text
                print(f"Gemini API Error: {response.status_code} - {error_detail}")
                raise HTTPException(status_code=500, detail=f"Gemini API error: {response.status_code}")

            result = response.json()
            
            # Check if response has the expected structure
            if "candidates" not in result or len(result["candidates"]) == 0:
                print(f"Unexpected Gemini response structure: {result}")
                raise HTTPException(status_code=500, detail="Unexpected response from Gemini API")
            
            # Handle different response structures
            candidate = result["candidates"][0]
            if "content" in candidate:
                if "parts" in candidate["content"]:
                    ai_response = candidate["content"]["parts"][0]["text"]
                elif "text" in candidate["content"]:
                    ai_response = candidate["content"]["text"]
                else:
                    print(f"Unexpected content structure: {candidate['content']}")
                    raise HTTPException(status_code=500, detail="Unexpected content structure from Gemini API")
            elif "text" in candidate:
                ai_response = candidate["text"]
            else:
                print(f"Unexpected candidate structure: {candidate}")
                raise HTTPException(status_code=500, detail="Unexpected candidate structure from Gemini API")
            
            # Clean up response (remove markdown code blocks if present)
            ai_response = ai_response.strip()
            if ai_response.startswith("```json"):
                ai_response = ai_response[7:]
            if ai_response.startswith("```"):
                ai_response = ai_response[3:]
            if ai_response.endswith("```"):
                ai_response = ai_response[:-3]
            ai_response = ai_response.strip()

            # Parse AI response
            try:
                viz_data = json.loads(ai_response)
            except json.JSONDecodeError as e:
                print(f"Failed to parse AI response as JSON: {ai_response}")
                raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {str(e)}")
            
            return VisualizationResponse(**viz_data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Visualization generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Visualization generation error: {str(e)}")


@app.post("/execute-visualization")
async def execute_visualization(request: Dict[str, Any]):
    """Execute Python visualization code and return Plotly JSON"""
    try:
        code = request.get("code", "")
        data = request.get("data", [])

        if not code:
            raise HTTPException(status_code=400, detail="No code provided")

        print(f"Executing visualization code:")
        print(f"Data length: {len(data)}")
        print(f"Code: {code[:200]}...")

        # Create a safe execution environment
        import plotly.express as px
        import pandas as pd
        import io
        import sys
        from contextlib import redirect_stdout, redirect_stderr

        # Prepare the execution namespace
        namespace = {
            'px': px,
            'pd': pd,
            'data': data,
            'json': json
        }

        # Capture output
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, namespace)
            
            # Get the figure from namespace (it should be assigned to 'fig')
            if 'fig' in namespace:
                fig = namespace['fig']
                fig_json = fig.to_json()
                print(f"Successfully generated chart")
                return {"success": True, "data": json.loads(fig_json)}
            else:
                error_msg = f"No 'fig' variable found. Available variables: {list(namespace.keys())}"
                print(error_msg)
                raise Exception(error_msg)

        except Exception as exec_error:
            error_msg = stderr_capture.getvalue() or str(exec_error)
            print(f"Execution error: {error_msg}")
            print(f"Stdout: {stdout_capture.getvalue()}")
            raise HTTPException(status_code=400, detail=f"Code execution error: {error_msg}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Execution error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")


@app.post("/generate-insights", response_model=InsightsResponse)
async def generate_insights(request: InsightsRequest):
    """Generate insights from data summary using Gemini AI"""
    try:
        gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_api_key:
            raise HTTPException(status_code=500, detail="Gemini API not configured")

        # Enhanced prompt to ensure we get exactly 5 insights
        prompt = f"""Analyze this dataset and provide EXACTLY 5 key insights.

Dataset Summary:
{request.summary}

REQUIREMENTS:
1. Generate EXACTLY 5 distinct insights (no more, no less)
2. Each insight must be substantive and data-driven
3. Format each insight as a markdown bullet point (starting with -)
4. Focus on different aspects:
   - Statistical patterns and trends
   - Data distribution and outliers
   - Correlations or relationships
   - Data quality observations
   - Actionable recommendations or predictions

Format your response as:
- Insight 1: [Your first insight here]
- Insight 2: [Your second insight here]
- Insight 3: [Your third insight here]
- Insight 4: [Your fourth insight here]
- Insight 5: [Your fifth insight here]"""

        # Retry logic for rate limits
        max_retries = 5  # Increased from 3 to 5
        last_error = None
        last_status_code = None

        for attempt in range(max_retries):
            try:
                print(f"\n=== Insights Generation Attempt {attempt + 1}/{max_retries} ===")

                async with httpx.AsyncClient(timeout=90.0) as client:  # Increased timeout to 90s
                    response = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}",
                        json={
                            "contents": [{
                                "parts": [{
                                    "text": prompt
                                }]
                            }],
                            "generationConfig": {
                                "temperature": 0.7,
                                "maxOutputTokens": 4096,  # Increased from 2048 to 4096
                                "topP": 0.95,
                                "topK": 40,
                            },
                            "safetySettings": [
                                {
                                    "category": "HARM_CATEGORY_HARASSMENT",
                                    "threshold": "BLOCK_NONE"
                                },
                                {
                                    "category": "HARM_CATEGORY_HATE_SPEECH",
                                    "threshold": "BLOCK_NONE"
                                },
                                {
                                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                    "threshold": "BLOCK_NONE"
                                },
                                {
                                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                                    "threshold": "BLOCK_NONE"
                                }
                            ]
                        }
                    )

                    last_status_code = response.status_code
                    print(f"Response status: {response.status_code}")

                    if response.status_code == 429:  # Rate limit
                        wait_time = (2 ** attempt) + 1  # 2s, 3s, 5s, 9s, 17s
                        print(f"Rate limited. Waiting {wait_time}s before retry...")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(wait_time)
                            continue
                        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again in a moment.")

                    if response.status_code == 503:  # Service unavailable
                        print(f"Service unavailable. Retrying...")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        raise HTTPException(status_code=503, detail="Gemini API temporarily unavailable")

                    if response.status_code != 200:
                        error_detail = response.text[:500]  # Limit error text
                        print(f"API error: {response.status_code} - {error_detail}")

                        # Retry on server errors
                        if response.status_code >= 500 and attempt < max_retries - 1:
                            print(f"Server error. Retrying...")
                            await asyncio.sleep(2 ** attempt)
                            continue

                        raise HTTPException(status_code=500, detail=f"Gemini API error: {response.status_code}")

                    result = response.json()
                    print(f"Response keys: {list(result.keys())}")

                    # Check for candidates
                    if "candidates" not in result or len(result["candidates"]) == 0:
                        print(f"No candidates. Full response: {json.dumps(result, indent=2)}")

                        # Check if blocked by safety
                        if "promptFeedback" in result:
                            feedback = result["promptFeedback"]
                            print(f"Prompt feedback: {feedback}")
                            if "blockReason" in feedback:
                                # Try again with a simpler prompt
                                if attempt < max_retries - 1:
                                    print(f"Content blocked. Retrying with adjusted prompt...")
                                    await asyncio.sleep(1)
                                    continue
                                raise HTTPException(status_code=400, detail=f"Content blocked: {feedback['blockReason']}")

                        # Retry if no candidates
                        if attempt < max_retries - 1:
                            print(f"No candidates returned. Retrying...")
                            await asyncio.sleep(2)
                            continue
                        raise HTTPException(status_code=500, detail="No insights generated")

                    candidate = result["candidates"][0]
                    print(f"Candidate keys: {list(candidate.keys())}")

                    # Check finish reason
                    if "finishReason" in candidate:
                        finish_reason = candidate["finishReason"]
                        print(f"Finish reason: {finish_reason}")

                        if finish_reason == "SAFETY":
                            if attempt < max_retries - 1:
                                print(f"Safety filter triggered. Retrying...")
                                await asyncio.sleep(1)
                                continue
                            raise HTTPException(status_code=400, detail="Content blocked by safety filters")

                        if finish_reason == "MAX_TOKENS":
                            print(f"Warning: Response was truncated at max tokens")

                        if finish_reason not in ["STOP", "MAX_TOKENS"]:
                            print(f"Unexpected finish reason: {finish_reason}")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(1)
                                continue

                    # Extract text from response
                    insights_text = None
                    if "content" in candidate:
                        if "parts" in candidate["content"] and len(candidate["content"]["parts"]) > 0:
                            insights_text = candidate["content"]["parts"][0].get("text")
                        elif "text" in candidate["content"]:
                            insights_text = candidate["content"]["text"]

                    if not insights_text or len(insights_text.strip()) == 0:
                        print(f"Empty or missing text. Candidate: {json.dumps(candidate, indent=2)}")
                        if attempt < max_retries - 1:
                            print(f"Empty response. Retrying...")
                            await asyncio.sleep(2)
                            continue
                        raise HTTPException(status_code=500, detail="Failed to extract insights from response")

                    # Validate we got insights
                    insight_count = insights_text.count('-')
                    print(f"Generated {insight_count} insights")

                    if insight_count < 3 and attempt < max_retries - 1:
                        print(f"Insufficient insights ({insight_count}). Retrying...")
                        await asyncio.sleep(1)
                        continue

                    print(f"✓ Successfully generated insights")
                    return InsightsResponse(insights=insights_text)

            except HTTPException:
                raise
            except httpx.TimeoutException as e:
                print(f"Timeout on attempt {attempt + 1}: {str(e)}")
                last_error = "Request timeout - API took too long to respond"
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
            except httpx.RequestError as e:
                print(f"Request error on attempt {attempt + 1}: {str(e)}")
                last_error = f"Network error: {str(e)}"
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
            except json.JSONDecodeError as e:
                print(f"JSON decode error on attempt {attempt + 1}: {str(e)}")
                last_error = "Invalid response from API"
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
            except KeyError as e:
                print(f"KeyError on attempt {attempt + 1}: {str(e)}")
                print(f"This might be due to unexpected API response structure")
                last_error = f"Unexpected response structure: {str(e)}"
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
            except Exception as e:
                print(f"Unexpected error on attempt {attempt + 1}: {str(e)}")
                import traceback
                traceback.print_exc()
                last_error = str(e)
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                raise

        # If all retries failed
        error_msg = f"Failed after {max_retries} attempts."
        if last_status_code:
            error_msg += f" Last status: {last_status_code}."
        if last_error:
            error_msg += f" Error: {last_error}"

        print(f"\n=== All retries exhausted ===")
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

    except HTTPException:
        raise
    except Exception as e:
        print(f"\n=== Fatal error in insights generation ===")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")


def clean_ai_response(text: str) -> str:
    """
    Clean up AI-generated responses by removing unnecessary formatting artifacts
    and making them more conversational.
    """
    # Remove horizontal rules (---)
    text = re.sub(r'^-{3,}\s*$', '', text, flags=re.MULTILINE)

    # Remove numbered section headers (### 1. Something, ### 2. Something)
    text = re.sub(r'^###?\s*\d+\.\s*(.+)$', r'**\1**', text, flags=re.MULTILINE)

    # Remove common AI section headers (case insensitive)
    sections_to_remove = [
        # Conclusions
        r'^###?\s*Conclusion:?\s*$',
        r'^###?\s*In conclusion:?\s*$',
        r'^###?\s*To conclude:?\s*$',
        r'^###?\s*Final thoughts:?\s*$',

        # Summaries
        r'^###?\s*Summary:?\s*$',
        r'^###?\s*In summary:?\s*$',
        r'^###?\s*To summarize:?\s*$',

        # Answers
        r'^###?\s*Answer:?\s*$',
        r'^###?\s*Response:?\s*$',
        r'^###?\s*My answer:?\s*$',

        # Analysis
        r'^###?\s*Analysis:?\s*$',
        r'^###?\s*Data analysis:?\s*$',
        r'^###?\s*Key findings:?\s*$',

        # Introductions
        r'^###?\s*Introduction:?\s*$',
        r'^###?\s*Overview:?\s*$',

        # Others
        r'^###?\s*Interpretation:?\s*$',
        r'^###?\s*Calculation:?\s*$',
        r'^###?\s*Results?:?\s*$',
        r'^###?\s*Explanation:?\s*$',
    ]

    for pattern in sections_to_remove:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)

    # Remove subsection headers like "#### Something:"
    text = re.sub(r'^####\s*(.+?):\s*$', r'**\1:**', text, flags=re.MULTILINE)

    # Remove any remaining ### or ## headers (convert main content to bold)
    # But keep the actual content
    text = re.sub(r'^###\s+(.+)$', r'**\1**', text, flags=re.MULTILINE)
    text = re.sub(r'^##\s+(.+)$', r'**\1**', text, flags=re.MULTILINE)

    # Remove "Note:" and "Important:" prefixes if they're standalone
    text = re.sub(r'^\*\*Note:\*\*\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\*\*Important:\*\*\s*', '', text, flags=re.MULTILINE)

    # Remove redundant opening phrases at the start
    opening_phrases = [
        r'^Based on the (data|information|dataset) (provided|given|available|you shared),?\s*',
        r'^According to the (data|information),?\s*',
        r'^From the data,?\s*',
        r'^Looking at the (data|information),?\s*',
        r'^Analyzing the (data|information),?\s*',
        r'^After analyzing the data,?\s*',
        r'^From what I can see,?\s*',
        r'^As per the data,?\s*',
        r'^In the context of .+?,?\s*',
    ]

    for pattern in opening_phrases:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # Remove closing phrases
    closing_phrases = [
        r'\s*I hope this helps!?\s*$',
        r'\s*Let me know if you (need|want|have) (any )?(more|other|further) (questions|help|assistance)!?\s*$',
        r'\s*Feel free to ask if you have (any )?(more|other) questions!?\s*$',
        r'\s*Is there anything else (you\'d like to know|I can help with)\??\s*$',
        r'\s*Does this answer your question\??\s*$',
    ]

    for pattern in closing_phrases:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # Remove "Here's" type openings
    text = re.sub(r'^Here\'s (what|the answer|my analysis|how):?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^Here is (what|the answer|my analysis|how):?\s*', '', text, flags=re.IGNORECASE)

    # Remove meta-commentary and tutorial phrases
    meta_phrases = [
        r'^Let\'s explore.+?[\.:]?\s*',
        r'^We intuitively expect.+?\.\s*',
        r'^For this analysis, we\'ll use.+?\.\s*',
        r'^We can use.+?\.\s*',
        r'^We\'ll use.+?\.\s*',
        r'^You will (likely )?get.+?\.\s*',
        r'^You\'ll (observe|see).+?\.\s*',
        r'^To show.+?, we can.+?\.\s*',
    ]

    for pattern in meta_phrases:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)

    # Remove tutorial-style numbered instructions
    text = re.sub(r'^\d+\.\s+[A-Z][^:]+:\s*$', '', text, flags=re.MULTILINE)

    # Remove code blocks in R, Python, etc (user already has data, doesn't need code)
    # Remove R code blocks
    text = re.sub(r'```[Rr]\n.+?```', '', text, flags=re.DOTALL)
    # Remove Python code blocks
    text = re.sub(r'```python\n.+?```', '', text, flags=re.DOTALL)
    # Remove generic code blocks
    text = re.sub(r'```\n.+?```', '', text, flags=re.DOTALL)

    # Remove inline R code markers
    text = re.sub(r'\bR\n', '', text)

    # Remove "Using X" section headers
    text = re.sub(r'^###?\s*Using (R|Python|SQL).+?$', '', text, flags=re.IGNORECASE | re.MULTILINE)

    # Remove "Result:" or "Output:" lines
    text = re.sub(r'^(Result|Output|Interpretation of the Output):?\s*$', '', text, flags=re.IGNORECASE | re.MULTILINE)

    # Remove installation instructions
    text = re.sub(r'install\.packages.+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'pip install.+', '', text, flags=re.IGNORECASE)

    # Clean up excessive line breaks (more than 2 consecutive)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove empty bold sections
    text = re.sub(r'\*\*\s*\*\*', '', text)

    # Remove leading/trailing whitespace
    text = text.strip()

    # If the response is mostly code blocks or examples, keep them
    # Otherwise, try to make it more conversational

    return text


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with AI about the data"""
    try:
        gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_api_key:
            raise HTTPException(status_code=500, detail="Gemini API not configured")

        # Build context-aware prompt with conversational instructions
        if request.context:
            prompt = f"""You're answering a colleague's quick question about their data. Be direct and conversational.

Data: {request.context}

Question: {request.message}

FORBIDDEN - DO NOT INCLUDE:
❌ "### " or "## " headers of ANY kind
❌ "---" horizontal lines
❌ Numbered steps like "1. Calculate" or "2. Visualize"
❌ Code examples in R or Python (they already have the data)
❌ Tutorial instructions like "Load the data" or "Install packages"
❌ Phrases: "Let's", "We can", "We'll use", "You will get"
❌ Section labels: "Conclusion", "Result", "Interpretation", "Using X"
❌ Meta-talk about what you're going to explain
❌ "I hope this helps" or similar closings

REQUIRED - YOU MUST:
✓ Start immediately with the direct answer
✓ State the key finding in the first sentence
✓ If showing math, do it inline: "The average is 42 (sum 420 / count 10)"
✓ Maximum 3-4 short sentences unless calculation needed
✓ Sound like a human, not a textbook
✓ Skip obvious context the user already knows

Example of GOOD answer:
"The correlation is -0.85, which is strong and negative. Cars with more cylinders get worse MPG - about 26 MPG for 4-cylinder vs 15 MPG for 8-cylinder in your data."

Example of BAD answer (DO NOT DO THIS):
"### Correlation Analysis
Let's explore the relationship...
1. Calculate correlation: -0.85
2. Interpretation: This shows..."

Your concise answer:"""
        else:
            prompt = f"""Answer this directly in 2-3 sentences max:

{request.message}

No headers, code, or tutorials. Just the answer."""

        # Retry logic
        max_retries = 5
        last_error = None

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}",
                        json={
                            "contents": [{
                                "parts": [{
                                    "text": prompt
                                }]
                            }],
                            "generationConfig": {
                                "temperature": 0.8,  # Higher for more natural conversation
                                "maxOutputTokens": 4096,
                                "topP": 0.95,
                                "topK": 40,
                            },
                            "safetySettings": [
                                {
                                    "category": "HARM_CATEGORY_HARASSMENT",
                                    "threshold": "BLOCK_NONE"
                                },
                                {
                                    "category": "HARM_CATEGORY_HATE_SPEECH",
                                    "threshold": "BLOCK_NONE"
                                },
                                {
                                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                    "threshold": "BLOCK_NONE"
                                },
                                {
                                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                                    "threshold": "BLOCK_NONE"
                                }
                            ]
                        }
                    )

                    if response.status_code == 429:  # Rate limit
                        if attempt < max_retries - 1:
                            import asyncio
                            await asyncio.sleep(2 ** attempt)
                            continue
                        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again.")

                    if response.status_code != 200:
                        print(f"Gemini API error: {response.status_code} - {response.text}")
                        raise HTTPException(status_code=500, detail=f"Gemini API error: {response.status_code}")

                    result = response.json()

                    # Check for candidates
                    if "candidates" not in result or len(result["candidates"]) == 0:
                        if "promptFeedback" in result and "blockReason" in result["promptFeedback"]:
                            raise HTTPException(status_code=400, detail="Content blocked by safety filters")
                        raise HTTPException(status_code=500, detail="No response generated")

                    candidate = result["candidates"][0]

                    # Check finish reason
                    if "finishReason" in candidate and candidate["finishReason"] == "SAFETY":
                        raise HTTPException(status_code=400, detail="Response blocked by safety filters")

                    # Extract text
                    response_text = None
                    if "content" in candidate:
                        if "parts" in candidate["content"]:
                            response_text = candidate["content"]["parts"][0]["text"]
                        elif "text" in candidate["content"]:
                            response_text = candidate["content"]["text"]

                    if not response_text:
                        raise HTTPException(status_code=500, detail="Failed to extract response")

                    # Clean up AI-generated formatting artifacts
                    cleaned_response = clean_ai_response(response_text)

                    return ChatResponse(response=cleaned_response)

            except HTTPException:
                raise
            except httpx.TimeoutException:
                last_error = "Request timeout"
                if attempt < max_retries - 1:
                    import asyncio
                    await asyncio.sleep(1)
                    continue
            except Exception as e:
                last_error = str(e)
                if attempt < max_retries - 1:
                    import asyncio
                    await asyncio.sleep(1)
                    continue
                raise

        raise HTTPException(status_code=500, detail=f"Failed after {max_retries} attempts: {last_error}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/detect-txt-delimiter", response_model=DelimiterInfo)
async def detect_txt_delimiter(request: TxtParseRequest):
    """Intelligently detect delimiter and structure of TXT file"""
    try:
        import csv
        from io import StringIO
        import re

        text = request.text

        # For preview, only analyze first 50 lines
        lines = text.split('\n')
        sample_size = min(50, len(lines)) if request.preview_only else len(lines)
        sample_text = '\n'.join(lines[:sample_size])

        # Common delimiters to test
        delimiters = [
            (',', 'comma'),
            ('\t', 'tab'),
            ('|', 'pipe'),
            (';', 'semicolon'),
            (' ', 'space')
        ]

        best_delimiter = None
        best_score = 0
        best_name = 'unknown'

        # Test each delimiter
        for delim, name in delimiters:
            try:
                # Parse with this delimiter
                reader = csv.reader(StringIO(sample_text), delimiter=delim)
                rows = list(reader)

                if len(rows) < 2:
                    continue

                # Calculate consistency score
                # Good delimiter produces consistent column counts
                col_counts = [len(row) for row in rows if row]
                if not col_counts:
                    continue

                avg_cols = sum(col_counts) / len(col_counts)
                consistency = sum(1 for c in col_counts if c == col_counts[0]) / len(col_counts)

                # Score: prefer higher column count and consistency
                score = consistency * (1 + min(avg_cols / 10, 1))

                # Bonus for common delimiters
                if delim in [',', '\t']:
                    score *= 1.2

                if score > best_score and avg_cols > 1:
                    best_score = score
                    best_delimiter = delim
                    best_name = name

            except Exception as e:
                continue

        # If no delimiter found with multiple columns, check if it's single column data
        if best_delimiter is None:
            # Check if it's single column numeric data or text
            non_empty_lines = [line.strip() for line in lines[:sample_size] if line.strip()]
            if non_empty_lines:
                # Single column - use newline as delimiter
                best_delimiter = '\n'
                best_name = 'newline (single column)'
                best_score = 1.0

        # Parse with best delimiter to get sample
        if best_delimiter == '\n':
            # Single column case
            sample_rows = [[line.strip()] for line in lines[:5] if line.strip()]
            column_count = 1

            # Detect if first row is a header
            # For single column, if first value is non-numeric and rest are numeric, it's likely a header
            has_header = False
            if len(sample_rows) > 1:
                first_is_num = sample_rows[0][0].replace('.', '').replace('-', '').isdigit()
                rest_are_num = all(
                    row[0].replace('.', '').replace('-', '').replace('+', '').isdigit()
                    for row in sample_rows[1:3] if row
                )
                has_header = not first_is_num and rest_are_num
        else:
            reader = csv.reader(StringIO(sample_text), delimiter=best_delimiter)
            all_rows = [row for row in reader if row]
            sample_rows = all_rows[:5]
            column_count = len(sample_rows[0]) if sample_rows else 0

            # Detect if first row is a header
            # Header detection: first row has different data type pattern than subsequent rows
            has_header = False
            if len(all_rows) > 1:
                first_row = all_rows[0]
                second_row = all_rows[1] if len(all_rows) > 1 else []

                if first_row and second_row:
                    # Check if first row is all text and second row has numbers
                    first_has_nums = any(cell.strip().replace('.', '').replace('-', '').isdigit() for cell in first_row if cell.strip())
                    second_has_nums = any(cell.strip().replace('.', '').replace('-', '').isdigit() for cell in second_row if cell.strip())

                    # If first row has no numbers but second row does, likely a header
                    if not first_has_nums and second_has_nums:
                        has_header = True
                    # Also check for common header keywords
                    elif any(keyword in ' '.join(first_row).lower() for keyword in ['name', 'id', 'date', 'value', 'column', 'field']):
                        has_header = True

        return DelimiterInfo(
            delimiter=best_delimiter if best_delimiter else ',',
            delimiter_name=best_name,
            confidence=best_score,
            has_header=has_header,
            column_count=column_count,
            sample_rows=sample_rows
        )

    except Exception as e:
        print(f"Delimiter detection error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")


@app.post("/convert-txt-to-json", response_model=TxtConvertResponse)
async def convert_txt_to_json(request: TxtConvertRequest):
    """Convert TXT file to JSON with intelligent parsing"""
    try:
        import csv
        from io import StringIO

        text = request.text
        lines = text.split('\n')
        total_lines = len(lines)

        # Determine if we need to show preview only
        is_preview = total_lines > request.preview_lines

        # For large files, show top 100 and bottom 100
        if is_preview:
            top_lines = lines[:100]
            bottom_lines = lines[-100:]
            # Add a separator comment
            working_lines = top_lines + ['... (middle rows omitted) ...'] + bottom_lines
            working_text = '\n'.join(working_lines)
        else:
            working_text = text
            working_lines = lines

        # Detect delimiter if not provided
        if request.delimiter is None:
            detect_request = TxtParseRequest(text=working_text, preview_only=True)
            delimiter_info = await detect_txt_delimiter(detect_request)
            delimiter = delimiter_info.delimiter
            has_header = delimiter_info.has_header if request.has_header is None else request.has_header
        else:
            delimiter = request.delimiter
            has_header = request.has_header if request.has_header is not None else False

        # Parse the data
        if delimiter == '\n':
            # Single column data
            data_lines = [line.strip() for line in working_lines if line.strip() and line.strip() != '... (middle rows omitted) ...']

            if has_header and data_lines:
                header = data_lines[0]
                values = data_lines[1:]
                json_array = [{header: val} for val in values]
            else:
                # Generate column name
                json_array = [{"value": val} for val in data_lines]
        else:
            # Multi-column delimited data
            reader = csv.reader(StringIO(working_text), delimiter=delimiter)
            rows = [row for row in reader if row and row != ['... (middle rows omitted) ...']]

            if not rows:
                raise HTTPException(status_code=400, detail="No data found in file")

            if has_header:
                headers = rows[0]
                data_rows = rows[1:]
            else:
                # Generate column names
                num_cols = len(rows[0])
                headers = [f"column_{i+1}" for i in range(num_cols)]
                data_rows = rows

            # Convert to JSON
            json_array = []
            for row in data_rows:
                if len(row) == len(headers):
                    row_dict = {}
                    for i, header in enumerate(headers):
                        # Try to convert to number if possible
                        value = row[i]
                        try:
                            # Try int first
                            if '.' not in value:
                                row_dict[header] = int(value)
                            else:
                                row_dict[header] = float(value)
                        except (ValueError, AttributeError):
                            row_dict[header] = value
                    json_array.append(row_dict)

        json_data = json.dumps(json_array, indent=2)

        # For actual conversion (not preview), use full dataset
        actual_row_count = total_lines - 1 if has_header else total_lines

        return TxtConvertResponse(
            json_data=json_data,
            delimiter_used=delimiter,
            has_header=has_header,
            total_rows=actual_row_count,
            is_preview=is_preview
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"TXT conversion error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
