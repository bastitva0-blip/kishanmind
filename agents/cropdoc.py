"""
CropDoc Agent — Diagnoses crop diseases from images.

Primary vision model: Gemini (gemini-3.5-flash by default, see llm_config.py).
Fallback vision model: Groq (a Llama-4 vision model), used automatically if
the Gemini call fails AND GROQ_API_KEY is set in .env. This fallback is
independent of which orchestrator (Gemini or Groq) routed the request here,
because this tool calls the vision APIs directly rather than going through
an ADK Agent's `model=`.
"""

import base64
import io
import logging
import os
from pathlib import Path

from google.adk.agents import Agent
from google.adk.tools.function_tool import FunctionTool
from google import genai
from google.genai import types as genai_types
from PIL import Image

from agents.llm_config import (
    FALLBACK_ENABLED,
    GEMINI_VISION_MODEL,
    GROQ_API_KEY,
    GROQ_VISION_MODEL,
    get_agent_model,
)

logger = logging.getLogger("kisanmind.cropdoc")

DIAGNOSIS_PROMPT = """
You are an expert agricultural plant pathologist. Analyze this crop image carefully.

Provide your diagnosis in this EXACT format:

CROP: [identified crop plant]
DISEASE: [disease name, or "Healthy" if no disease detected]
CONFIDENCE: [High / Medium / Low]
SEVERITY: [Mild / Moderate / Severe / None]
CAUSE: [Fungal / Bacterial / Viral / Pest / Nutritional / Environmental / None]
SYMPTOMS: [observed symptoms in 2-3 sentences]
TREATMENT:
  - Immediate: [what to do right now]
  - Chemical: [recommended pesticide/fungicide with dosage if applicable]
  - Organic: [organic/natural alternative]
PREVENTION: [2-3 sentences on how to prevent this in future]
URGENCY: [Act immediately / Within a week / Monitor only / No action needed]

If the image is not a plant or crop, say so clearly.
"""

_DIAGNOSIS_KEYS = {"CROP", "DISEASE", "CONFIDENCE", "SEVERITY", "CAUSE", "URGENCY"}


def _load_image_bytes(image_path: str) -> bytes:
    """Load an image from disk, downscale it, and return JPEG bytes."""
    img_path = Path(image_path)
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    with Image.open(img_path) as img:
        if max(img.size) > 1024:
            img = img.copy()
            img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=85)
        return buf.getvalue()


def _parse_diagnosis(raw_text: str, source: str) -> dict:
    """Turn the model's structured-text reply into a dict."""
    result: dict = {"raw_analysis": raw_text.strip(), "analyzed_by": source}
    for line in raw_text.split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip().upper().replace(" ", "_")
            value = value.strip()
            if key in _DIAGNOSIS_KEYS:
                result[key.lower()] = value
    return result


def _diagnose_with_gemini(img_bytes: bytes) -> dict:
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    response = client.models.generate_content(
        model=GEMINI_VISION_MODEL,
        contents=[
            genai_types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
            genai_types.Part.from_text(text=DIAGNOSIS_PROMPT),
        ],
    )
    raw_text = response.text or ""
    if not raw_text.strip():
        raise RuntimeError("Gemini returned an empty response")
    return _parse_diagnosis(raw_text, source=f"Gemini ({GEMINI_VISION_MODEL})")


def _diagnose_with_groq(img_bytes: bytes) -> dict:
    import litellm  # imported lazily so it's optional unless fallback is used

    b64_image = base64.b64encode(img_bytes).decode("utf-8")
    response = litellm.completion(
        model=f"groq/{GROQ_VISION_MODEL}",
        api_key=GROQ_API_KEY,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": DIAGNOSIS_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"},
                    },
                ],
            }
        ],
    )
    raw_text = response.choices[0].message.content or ""
    if not raw_text.strip():
        raise RuntimeError("Groq returned an empty response")
    return _parse_diagnosis(raw_text, source=f"Groq fallback ({GROQ_VISION_MODEL})")


def analyze_crop_image(image_path: str) -> dict:
    """
    Analyze a crop image for disease. Tries Gemini vision first; if that
    fails (quota, network, bad key, etc.) and a Groq key is configured,
    automatically retries on Groq's vision model instead.

    Args:
        image_path: Path to the image file (jpg/png)

    Returns:
        Dictionary with diagnosis, severity, cause, and treatment
    """
    try:
        img_bytes = _load_image_bytes(image_path)
    except Exception as e:
        return {"error": f"Could not read image: {e}"}

    try:
        return _diagnose_with_gemini(img_bytes)
    except Exception as gemini_error:
        logger.warning("Gemini vision failed: %s", gemini_error)
        if not FALLBACK_ENABLED:
            return {"error": f"Image analysis failed: {gemini_error}"}

        try:
            return _diagnose_with_groq(img_bytes)
        except Exception as groq_error:
            logger.error("Groq vision fallback also failed: %s", groq_error)
            return {
                "error": (
                    f"Image analysis failed on both providers. "
                    f"Gemini: {gemini_error} | Groq fallback: {groq_error}"
                )
            }


def create_cropdoc_agent(use_fallback: bool = False) -> Agent:
    """Create and return the CropDoc agent."""
    return Agent(
        name="CropDoc",
        model=get_agent_model(use_fallback),
        description=(
            "An AI plant doctor that diagnoses crop diseases from photos. "
            "Uses vision AI to identify diseases, pests, and nutritional "
            "deficiencies, then recommends treatment options."
        ),
        instruction="""
You are CropDoc, an expert AI plant doctor for Indian farmers.

When a farmer shares a crop image:
1. Use the analyze_crop_image tool with the provided image path.
2. Explain the diagnosis in simple, farmer-friendly language.
3. Prioritize organic/low-cost treatments where possible.
4. Mention if they should consult a local Krishi Vigyan Kendra (KVK) for severe cases.
5. If no disease is detected, confirm the crop looks healthy and give maintenance tips.

Always format your response as:

🌿 CropDoc Diagnosis Report
─────────────────────────────
🔍 Crop Identified: [crop]
🦠 Disease/Issue: [disease or "Healthy"]
📊 Confidence: [level] | Severity: [level]

📋 What I See:
[2-3 sentences about visible symptoms]

💊 Treatment Plan:
  ⚡ Immediate Action: [action]
  🧪 Chemical Option: [product + dosage]
  🌱 Organic Option: [natural alternative]

🛡️ Prevention:
[prevention tips]

⏰ Urgency: [urgency level]

📞 Need expert help? Contact your local KVK:
   https://kvk.icar.gov.in/
""",
        tools=[FunctionTool(func=analyze_crop_image)],
    )
