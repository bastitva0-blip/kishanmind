"""
Central LLM configuration for KisanMind.

Why this file exists:
- All 5 agents (Orchestrator, CropDoc, MarketMind, WeatherWatch, SchemeScout)
  used to hardcode "gemini-1.5-flash" individually. Changing models meant
  editing 5 files.
- Now every agent reads its model from here, which itself reads from
  environment variables (see .env.example). Change the model in one place
  (or one line in .env) and every agent picks it up.

Fallback behaviour:
- KisanMind's primary brain is Google Gemini.
- If GROQ_API_KEY is set in .env, KisanMind can automatically retry a failed
  Gemini call on Groq (e.g. if your Gemini key is rate-limited, out of quota,
  or Google's API is briefly down). This is a simple "try primary, then try
  fallback" retry — not a deep/permanent switch. See main.py's run_agent().
"""

import os
import logging

logger = logging.getLogger("kisanmind.llm_config")

# ── Primary provider: Google Gemini ─────────────────────────────────────
# gemini-3.5-flash is the current GA "fast" Gemini model (mid-2026).
# Override with GEMINI_MODEL in .env if you want a different one
# (e.g. "gemini-3.5-pro", "gemini-flash-latest").
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

# The CropDoc agent calls Gemini's vision endpoint directly (not through the
# ADK agent's `model=`), so it gets its own override.
GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", GEMINI_MODEL)

# ── Fallback provider: Groq ──────────────────────────────────────────────
# Groq hosts fast, cheap, OPEN models (Llama, etc.) over an API. KisanMind
# reaches Groq through LiteLLM, which Google ADK officially supports as a
# "model connector" (pip install litellm).
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
# A Groq vision-capable model, used only as CropDoc's image-analysis fallback.
GROQ_VISION_MODEL = os.getenv(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)

# Fallback is only active if a Groq key is actually present.
FALLBACK_ENABLED = bool(GROQ_API_KEY)

if FALLBACK_ENABLED:
    logger.info("Groq fallback ENABLED — will retry on %s if Gemini fails.", GROQ_MODEL)
else:
    logger.info("Groq fallback disabled (no GROQ_API_KEY set in .env).")


def get_agent_model(use_fallback: bool = False):
    """
    Returns whatever should be passed as an ADK Agent's `model=` argument.

    use_fallback=False (default) -> "gemini-3.5-flash" (a plain string;
        ADK resolves Gemini model strings natively, no wrapper needed).
    use_fallback=True  -> a LiteLlm-wrapped Groq model (requires
        `pip install litellm` and GROQ_API_KEY set in .env).
    """
    if not use_fallback:
        return GEMINI_MODEL

    if not FALLBACK_ENABLED:
        # Shouldn't normally be called this way, but fail loudly instead of
        # silently handing back the Gemini model under a fallback label.
        raise RuntimeError(
            "Groq fallback requested but GROQ_API_KEY is not set in .env"
        )

    from google.adk.models.lite_llm import LiteLlm

    return LiteLlm(model=f"groq/{GROQ_MODEL}", api_key=GROQ_API_KEY)
