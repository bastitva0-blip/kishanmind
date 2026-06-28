# ---- Stage 1: build the React/Vite frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python backend (FastAPI) ----
FROM python:3.11-slim
WORKDIR /app

# System deps some Python packages need to build wheels
RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY agents/ ./agents/
COPY mcp_server/ ./mcp_server/
COPY main.py .

# Drop in the frontend build from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Render/Railway/Fly all inject $PORT — fall back to 8000 for local `docker run`
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
