"""
KisanMind FastAPI Backend
- Serves React PWA build (dist/) as static files
- REST API endpoints for all 4 agents
- Dedicated endpoints: /api/weather, /api/prices, /api/schemes for React tab components
"""

import asyncio
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
import uvicorn
from dotenv import load_dotenv

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from agents.orchestrator import create_orchestrator
from agents.llm_config import FALLBACK_ENABLED, GEMINI_MODEL, GROQ_MODEL
from mcp_server.tools import get_weather_forecast, get_mandi_prices, get_schemes

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kisanmind.main")

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = FastAPI(title="KisanMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_NAME = "kisanmind"
session_service = InMemorySessionService()
_runner: Optional[Runner] = None

fallback_session_service = InMemorySessionService()
_fallback_runner: Optional[Runner] = None


def get_runner() -> Runner:
    global _runner
    if _runner is None:
        orchestrator = create_orchestrator()
        _runner = Runner(
            agent=orchestrator,
            app_name=APP_NAME,
            session_service=session_service,
        )
    return _runner


def get_fallback_runner() -> Optional[Runner]:
    """Returns the Groq-backed runner, or None if no GROQ_API_KEY is set."""
    global _fallback_runner
    if not FALLBACK_ENABLED:
        return None
    if _fallback_runner is None:
        fallback_orchestrator = create_orchestrator(use_fallback=True)
        _fallback_runner = Runner(
            agent=fallback_orchestrator,
            app_name=APP_NAME,
            session_service=fallback_session_service,
        )
    return _fallback_runner


# ─────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message too long — max 2000 characters")
        return v


class ChatResponse(BaseModel):
    response: str
    session_id: str
    agent_used: Optional[str] = None


# ─────────────────────────────────────────────
# ADK runner
# ─────────────────────────────────────────────
async def _run_once(
    runner: Runner,
    svc: InMemorySessionService,
    message: str,
    session_id: str,
) -> tuple[str, str]:
    """Run a single message through the given runner/session service."""
    try:
        await svc.create_session(
            app_name=APP_NAME, user_id="farmer", session_id=session_id
        )
    except Exception:
        pass  # session already exists, continue

    user_message = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=message)]
    )

    response_text = ""
    agent_name = "KisanMind"

    async for event in runner.run_async(
        user_id="farmer",
        session_id=session_id,
        new_message=user_message,
    ):
        if event.is_final_response():
            if event.content and event.content.parts:
                response_text = event.content.parts[0].text or ""
            if hasattr(event, "author"):
                agent_name = event.author

    return response_text.strip(), agent_name


def _is_transient_error(error: Exception) -> bool:
    """
    Returns True for errors that are worth retrying:
    - 429 rate limit / quota exhausted
    - 503 server overload / high demand
    - Any temporary unavailability
    """
    s = str(error).lower()
    return any(k in s for k in (
        "429", "resource_exhausted", "quota", "too many requests", "rate limit",
        "503", "unavailable", "high demand", "overloaded", "try again", "temporarily",
        "server error", "servererror",
    ))


async def run_agent(message: str, session_id: str) -> tuple[str, str]:
    """
    Run the farmer's message through KisanMind.

    Strategy:
      1. Try Gemini up to 3 times with exponential backoff on transient errors
         (both 429 rate limits AND 503 overload errors).
      2. If all Gemini attempts fail AND GROQ_API_KEY is set, retry once on Groq.
      3. If nothing works, return a friendly error message instead of crashing.
    """
    last_error: Exception = RuntimeError("Unknown error")

    # ── Step 1: Gemini with retry + backoff ─────────────────────────────
    for attempt in range(3):
        try:
            response_text, agent_name = await _run_once(
                get_runner(), session_service, message, session_id
            )
            if not response_text:
                raise RuntimeError("Gemini returned an empty response")
            return response_text, agent_name

        except Exception as e:
            last_error = e
            if _is_transient_error(e) and attempt < 2:
                wait = 2 ** attempt  # 1s → 2s → give up
                logger.warning(
                    "Gemini transient error (attempt %d/3) — retrying in %ds. Error: %s",
                    attempt + 1, wait, e,
                )
                await asyncio.sleep(wait)
                continue
            logger.error("Gemini call failed (attempt %d/3): %s", attempt + 1, e)
            break

    # ── Step 2: Groq fallback ────────────────────────────────────────────
    fallback_runner = get_fallback_runner()
    if fallback_runner is not None:
        logger.warning("All Gemini attempts failed — trying Groq fallback (%s).", GROQ_MODEL)
        try:
            fallback_session_id = f"fallback_{session_id}"
            response_text, agent_name = await _run_once(
                fallback_runner, fallback_session_service, message, fallback_session_id
            )
            if response_text:
                return response_text, f"{agent_name} (Groq fallback)"
        except Exception as fallback_error:
            logger.error("Groq fallback also failed: %s", fallback_error)

    # ── Step 3: Friendly error ───────────────────────────────────────────
    logger.error("All providers failed. Last error: %s", last_error)
    if _is_transient_error(last_error):
        return (
            "⚠️ The AI service is temporarily busy. Please try again in a moment.",
            "KisanMind",
        )
    return (
        f"⚠️ Could not get a response right now. Please try again in a moment.\n"
        f"(Error: {str(last_error)[:120]})",
        "KisanMind",
    )


# ─────────────────────────────────────────────
# API Routes — /api prefix matches the React frontend
# ─────────────────────────────────────────────
api = APIRouter(prefix="/api")


@api.get("/health")
async def health() -> dict:
    return {
        "status": "healthy",
        "google_api_key":   "✅ Set" if os.getenv("GOOGLE_API_KEY")   else "❌ Missing",
        "data_gov_api_key": "✅ Set" if os.getenv("DATA_GOV_API_KEY") else "❌ Missing",
        "groq_api_key": "✅ Set" if os.getenv("GROQ_API_KEY") else "➖ Not set",
        "primary_model": GEMINI_MODEL,
        "fallback_model": f"groq/{GROQ_MODEL}" if FALLBACK_ENABLED else None,
        "fallback_enabled": FALLBACK_ENABLED,
    }


@api.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    session_id = request.session_id or str(uuid.uuid4())
    try:
        response, agent_used = await run_agent(request.message, session_id)
        return ChatResponse(response=response, session_id=session_id, agent_used=agent_used)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api.post("/analyze-crop")
async def analyze_crop(file: UploadFile = File(...)) -> dict:
    if file.content_type not in ("image/jpeg", "image/jpg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP accepted.")

    temp_dir = Path("C:/Temp/kisanmind_uploads") if os.name == "nt" else Path("/tmp/kisanmind_uploads")
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{uuid.uuid4()}_{file.filename}"

    try:
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Max 10MB.")
        temp_path.write_bytes(content)

        message = f"Please diagnose the crop disease in the image at: {temp_path}"
        response, _ = await run_agent(message, str(uuid.uuid4()))
        return {"diagnosis": response, "image_received": file.filename}
    finally:
        if temp_path.exists():
            temp_path.unlink()


@api.get("/weather")
async def weather(location: str = Query(default="Lucknow")) -> dict:
    try:
        result = await get_weather_forecast(location=location, days=7)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/prices")
async def prices(
    state: str = Query(default="Uttar Pradesh"),
    commodity: str = Query(default="Wheat")
) -> dict:
    try:
        result = await get_mandi_prices(state=state, commodity=commodity, limit=20)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/schemes")
async def schemes(query: str = Query(default="")) -> dict:
    try:
        result = await get_schemes(query=query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


app.include_router(api)

# ─────────────────────────────────────────────
# Serve React PWA (must be AFTER API routes)
# ─────────────────────────────────────────────
FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(status_code=404, detail="Frontend not built.")
else:
    @app.get("/")
    async def root() -> dict:
        return {
            "message": "🌾 KisanMind API running!",
            "note": "Frontend not built yet. Run: cd frontend && npm install && npm run build",
            "api_docs": "/docs"
        }

# ─────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
