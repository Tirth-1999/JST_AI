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

from toon_converter import json_to_toon, calculate_metrics
from database import engine, get_db
import models
from auth import oauth, create_access_token, get_current_user, get_or_create_user

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
        gemini_api_key = os.getenv("GEMINI_API_KEY")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
