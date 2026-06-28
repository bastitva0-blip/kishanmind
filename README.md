# 🌾 KisanMind — AI Farming Assistant for Indian Farmers

KisanMind is a multi-agent AI system built with **Google ADK** and **Gemini 3.5 Flash** (with an automatic **Groq** fallback) that helps Indian farmers with:

- 🌿 **Crop Disease Diagnosis** — Upload a photo, get instant diagnosis + treatment
- 💰 **Mandi Price Intelligence** — Real-time prices from Agmarknet across India
- 🌤️ **Weather-Based Farming Advice** — 7-day forecasts tailored for farmers
- 🏛️ **Government Scheme Discovery** — Find PM-KISAN, PMFBY, KCC and more

---

## 🏗️ Architecture

```
KisanMind Orchestrator (Google ADK)
├── 🌿 CropDoc Agent          → Gemini Vision (Groq vision fallback) for disease detection
├── 💰 MarketMind Agent       → Agmarknet mandi prices via data.gov.in
├── 🌤️ WeatherWatch Agent     → Open-Meteo free weather API
└── 🏛️ SchemeScout Agent      → Static scheme database (PM-KISAN etc.)
        ↑
    MCP Server (3 tools)
    ├── get_mandi_prices()
    ├── get_weather_forecast()
    └── get_schemes()
```

---

## ⚡ Quick Setup

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/kisanmind.git
cd kisanmind
pip install -r requirements.txt
```

### 2. Set up API keys
```bash
cp .env.example .env
# Edit .env and add your keys:
# GOOGLE_API_KEY=...   (from aistudio.google.com)
# DATA_GOV_API_KEY=... (from data.gov.in)
# GROQ_API_KEY=...     (optional, from console.groq.com — enables automatic
#                        fallback if Gemini fails)
```

### 3. Run locally (2 terminals)

**Terminal 1 — Backend:**
```bash
python main.py
# API running at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
streamlit run app.py
# UI at http://localhost:8501
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/health` | API key status |
| POST | `/chat` | Main chat endpoint |
| POST | `/analyze-crop` | Upload image for disease diagnosis |

### Chat example:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are wheat prices in Punjab today?"}'
```

---

## 🧠 Models & Automatic Fallback

All 5 agents read their model from `agents/llm_config.py`, which itself reads
from `.env`:

| Setting | Default | Purpose |
|---|---|---|
| `GEMINI_MODEL` | `gemini-3.5-flash` | Primary chat/text model |
| `GEMINI_VISION_MODEL` | same as above | CropDoc's image diagnosis model |
| `GROQ_API_KEY` | _(unset)_ | If set, enables the fallback below |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Fallback chat/text model |
| `GROQ_VISION_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` | Fallback image-diagnosis model |

**How the fallback works:** every request first goes to Gemini. If that call
errors out (bad/expired key, rate limit, quota exceeded, Google API briefly
down), and `GROQ_API_KEY` is set, KisanMind automatically retries the exact
same message on Groq instead of failing — no restart needed. This is a
per-request retry, not a permanent switch; the next message tries Gemini
again first. If `GROQ_API_KEY` is left blank, KisanMind behaves exactly as
before (Gemini-only).

Check `GET /api/health` to see which models are active and whether the
fallback is currently enabled.



1. Create a new Space at [huggingface.co/spaces](https://huggingface.co/spaces)
2. Choose **Streamlit** SDK
3. Push your code:
```bash
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/kisanmind
git push hf main
```
4. Add secrets in Space Settings → Variables and Secrets:
   - `GOOGLE_API_KEY`
   - `DATA_GOV_API_KEY`

---

## 🔑 API Keys Needed

| Key | Where to Get | Cost |
|-----|-------------|------|
| `GOOGLE_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | Free |
| `DATA_GOV_API_KEY` | [data.gov.in](https://data.gov.in) | Free |
| `GROQ_API_KEY` (optional) | [console.groq.com](https://console.groq.com) | Free tier available |
| Open-Meteo | No key needed! | Free forever |

---

## 📁 Project Structure

```
kisanmind/
├── agents/
│   ├── llm_config.py       # Central model + Groq-fallback config
│   ├── orchestrator.py     # Routes queries to right agent
│   ├── cropdoc.py          # Disease diagnosis (Gemini Vision + Groq fallback)
│   ├── marketmind.py       # Mandi price intelligence
│   ├── weatherwatch.py     # Weather + farming advice
│   └── schemescout.py      # Govt scheme finder
├── mcp_server/
│   └── tools.py            # 3 MCP tools (weather, prices, schemes)
├── app.py                  # Streamlit frontend
├── main.py                 # FastAPI backend
├── requirements.txt
├── .env.example            # Safe template (push this)
├── .gitignore              # .env is always excluded
└── README.md
```

---

## 🛡️ Security

- All API keys loaded via `python-dotenv` — never hardcoded
- `.env` excluded from git via `.gitignore`
- Input validation via Pydantic models
- File upload size limit: 10MB
- Accepted image types: JPG, PNG, WebP only

---

## 🤝 Built With

- [Google ADK](https://google.github.io/adk-docs/) — Multi-agent orchestration
- [Gemini 3.5 Flash](https://aistudio.google.com) — Vision + language AI
- [Groq](https://groq.com) + [LiteLLM](https://docs.litellm.ai) — Automatic fallback if Gemini fails
- [FastAPI](https://fastapi.tiangolo.com) — Backend API
- [Streamlit](https://streamlit.io) — Frontend UI
- [Open-Meteo](https://open-meteo.com) — Free weather API
- [data.gov.in](https://data.gov.in) — Agmarknet mandi prices

---

*Made with ❤️ for Indian Farmers*
