# 🌾 KisanMind — Multi-Agent AI Farming Assistant for Indian Farmers

> **An intelligent multi-agent AI platform built with Google ADK that empowers Indian farmers with crop disease diagnosis, market intelligence, weather-aware farming recommendations, and government scheme discovery through collaborative AI agents.**


![Python](https://img.shields.io/badge/Python-3.11-blue)
![Google ADK](https://img.shields.io/badge/Google-ADK-green)
![Gemini](https://img.shields.io/badge/Google-Gemini_3.5_Flash-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![Streamlit](https://img.shields.io/badge/Streamlit-Frontend-red)
![License](https://img.shields.io/badge/License-MIT-green)

---

# 🚜 Problem Statement

Over **140 million Indian farmers** face fragmented access to agricultural knowledge.

They often struggle with

* Identifying crop diseases quickly
* Finding reliable mandi prices
* Planning around changing weather
* Discovering government support schemes

Most existing applications solve only **one** of these problems.

KisanMind brings them together inside **one intelligent multi-agent ecosystem**.

---

# 💡 Solution

KisanMind uses **Google ADK** to orchestrate specialized AI agents that collaborate to answer farmer queries using real-time APIs and multimodal reasoning.

Instead of relying on a single LLM, every request is routed to the most appropriate domain expert.

This results in

* higher accuracy
* lower latency
* modular scalability
* easier maintenance

---

# 🤖 Multi-Agent Architecture

```
                        User

                         │

                 Google ADK Orchestrator

      ┌──────────────┬──────────────┬──────────────┬──────────────┐
      │              │              │              │
 CropDoc       MarketMind      WeatherWatch    SchemeScout
      │              │              │              │
Gemini Vision   Agmarknet API   OpenMeteo API   Govt Schemes

                MCP Tool Server
         ├── Weather Tool
         ├── Market Tool
         └── Scheme Tool
```

---

# ✨ Features

## 🌿 Crop Disease Diagnosis

* Image upload
* Gemini Vision reasoning
* Automatic treatment recommendation
* Fertilizer suggestions

---

## 💰 Market Intelligence

* Live Agmarknet prices
* Nearby mandi comparison
* Price trends
* Better selling recommendations

---

## 🌦 Weather Intelligence

* 7-day forecast
* Crop-specific recommendations
* Rain alerts
* Irrigation planning

---

## 🏛 Government Schemes

Automatically finds

* PM-KISAN
* PMFBY
* KCC
* State subsidy programs

---

# 🧠 Agent Collaboration

Rather than answering directly,

the Orchestrator

✔ understands intent

✔ delegates work

✔ combines outputs

✔ produces one unified response

This follows Google's Agent Development Kit design philosophy.

---

# 🔌 MCP Tools

KisanMind demonstrates the **Model Context Protocol (MCP)** using reusable tools.

| Tool         | Purpose            |
| ------------ | ------------------ |
| Weather Tool | Weather forecasts  |
| Market Tool  | Agmarknet prices   |
| Scheme Tool  | Government schemes |

Every agent accesses shared capabilities through MCP.

---

# 🔄 Automatic LLM Fallback

Primary Model

```
Gemini 3.5 Flash
```

Fallback

```
Groq
↓
Llama 3.3 70B
```

If Gemini experiences

* quota limits
* API failures
* temporary downtime

the request automatically retries on Groq without interrupting the user.

---

# 🔒 Security

* Environment variables
* No API keys in source code
* Input validation
* Secure image uploads
* File size limits
* MIME validation
* Pydantic request models

---

# 📦 Tech Stack

### AI

* Google ADK
* Gemini 3.5 Flash
* LiteLLM
* Groq

### Backend

* FastAPI
* Python

### Frontend

* Streamlit

### APIs

* Open-Meteo
* data.gov.in (Agmarknet)

### Protocols

* MCP

---

# 🚀 Deployment

Supports deployment on

* Hugging Face Spaces
* Render
* Railway
* Docker
* Local Machine

---

# 📊 Future Roadmap

* Voice conversations in Hindi
* Offline edge inference
* WhatsApp farming assistant
* Pest outbreak prediction
* Satellite imagery analysis
* Personalized crop calendars
* IoT sensor integration

---

# 🎯 Kaggle AI Agents Course Concepts Demonstrated

| Concept                     | Implementation                     |
| --------------------------- | ---------------------------------- |
| ✅ Google ADK                | Multi-Agent Orchestration          |
| ✅ MCP Server                | Shared Tool Calling                |
| ✅ Deployability             | FastAPI + Streamlit                |
| ✅ Security                  | Environment Variables + Validation |
| ✅ Agent Skills              | Specialized Domain Agents          |
| ✅ Multi-Agent Collaboration | Intent Routing                     |


**Astitva Bhardwaj**
AI Engineer • Machine Learning • Multi-Agent Systems


