"""
KisanMind MCP Server — 3 tools:
  1. get_mandi_prices()    → data.gov.in Agmarknet API
  2. get_weather_forecast() → Open-Meteo (no key needed)
  3. get_schemes()          → static JSON of PM-Kisan / state schemes
"""

import os
import json
import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("KisanMind Tools")

# ─────────────────────────────────────────────
# TOOL 1: Mandi Prices via data.gov.in
# ─────────────────────────────────────────────
@mcp.tool()
async def get_mandi_prices(
    state: str = "Uttar Pradesh",
    commodity: str = "Wheat",
    limit: int = 10
) -> dict:
    """
    Fetch latest mandi (market) prices from Agmarknet via data.gov.in.

    Args:
        state: Indian state name (e.g. "Punjab", "Maharashtra")
        commodity: Crop name (e.g. "Wheat", "Rice", "Tomato")
        limit: Number of records to return (default 10)

    Returns:
        Dictionary with mandi price records
    """
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        return {"error": "DATA_GOV_API_KEY not set in environment"}

    url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    params = {
        "api-key": api_key,
        "format": "json",
        "limit": limit,
        "filters[state]": state,
        "filters[commodity]": commodity,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        records = data.get("records", [])
        if not records:
            return {
                "message": f"No price data found for {commodity} in {state}.",
                "records": []
            }

        return {
            "commodity": commodity,
            "state": state,
            "total_records": len(records),
            "records": [
                {
                    "market": r.get("market", "N/A"),
                    "district": r.get("district", "N/A"),
                    "min_price": r.get("min_price", "N/A"),
                    "max_price": r.get("max_price", "N/A"),
                    "modal_price": r.get("modal_price", "N/A"),
                    "date": r.get("arrival_date", "N/A"),
                }
                for r in records
            ]
        }

    except httpx.HTTPStatusError as e:
        return {"error": f"API error {e.response.status_code}: {str(e)}"}
    except Exception as e:
        return {"error": f"Failed to fetch mandi prices: {str(e)}"}


# ─────────────────────────────────────────────
# TOOL 2: Weather Forecast via Open-Meteo (FREE, no key)
# ─────────────────────────────────────────────

# Common Indian farming locations (lat, lon)
LOCATION_COORDS = {
    "delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "lucknow": (26.8467, 80.9462),
    "chandigarh": (30.7333, 76.7794),
    "bhopal": (23.2599, 77.4126),
    "patna": (25.5941, 85.1376),
    "jaipur": (26.9124, 75.7873),
    "hyderabad": (17.3850, 78.4867),
    "bangalore": (12.9716, 77.5946),
    "kolkata": (22.5726, 88.3639),
    "nagpur": (21.1458, 79.0882),
    "amritsar": (31.6340, 74.8723),
    "ludhiana": (30.9010, 75.8573),
    "indore": (22.7196, 75.8577),
}

@mcp.tool()
async def get_weather_forecast(
    location: str = "Lucknow",
    days: int = 7
) -> dict:
    """
    Fetch weather forecast for any Indian city — completely free, no API key.

    Args:
        location: City name (e.g. "Lucknow", "Pune", "Amritsar")
        days: Number of forecast days (1–16, default 7)

    Returns:
        Daily weather forecast with temp, rain, wind info
    """
    location_lower = location.lower().strip()
    coords = LOCATION_COORDS.get(location_lower)

    # If city not in our map, use geocoding
    if not coords:
        try:
            geo_url = "https://geocoding-api.open-meteo.com/v1/search"
            async with httpx.AsyncClient(timeout=10) as client:
                geo_resp = await client.get(geo_url, params={"name": location, "count": 1})
                geo_data = geo_resp.json()
            results = geo_data.get("results", [])
            if not results:
                return {"error": f"Location '{location}' not found. Try a major city name."}
            coords = (results[0]["latitude"], results[0]["longitude"])
        except Exception as e:
            return {"error": f"Geocoding failed: {str(e)}"}

    lat, lon = coords
    days = max(1, min(days, 16))

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "windspeed_10m_max",
            "weathercode",
        ],
        "timezone": "Asia/Kolkata",
        "forecast_days": days,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        rain = daily.get("precipitation_sum", [])
        wind = daily.get("windspeed_10m_max", [])
        codes = daily.get("weathercode", [])

        def interpret_wmo(code):
            if code == 0: return "Clear sky ☀️"
            elif code in (1, 2, 3): return "Partly cloudy ⛅"
            elif code in (45, 48): return "Foggy 🌫️"
            elif code in (51, 53, 55): return "Drizzle 🌦️"
            elif code in (61, 63, 65): return "Rain 🌧️"
            elif code in (71, 73, 75): return "Snow ❄️"
            elif code in (80, 81, 82): return "Rain showers 🌧️"
            elif code in (95, 96, 99): return "Thunderstorm ⛈️"
            else: return "Variable 🌤️"

        forecast = []
        for i, date in enumerate(dates):
            forecast.append({
                "date": date,
                "condition": interpret_wmo(codes[i] if i < len(codes) else 0),
                "max_temp_c": max_temps[i] if i < len(max_temps) else None,
                "min_temp_c": min_temps[i] if i < len(min_temps) else None,
                "rainfall_mm": rain[i] if i < len(rain) else 0,
                "wind_kmh": wind[i] if i < len(wind) else 0,
            })

        # Farming advisory based on forecast
        total_rain = sum(r for r in rain if r)
        advisory = []
        if total_rain > 50:
            advisory.append("⚠️ Heavy rain expected — delay sowing and harvesting if possible.")
        elif total_rain < 5:
            advisory.append("💧 Low rainfall — consider irrigation this week.")
        if any(t > 40 for t in max_temps if t):
            advisory.append("🌡️ Heat stress alert — water crops in early morning or evening.")
        if any(w > 40 for w in wind if w):
            advisory.append("💨 Strong winds expected — secure crop covers and young plants.")

        return {
            "location": location,
            "coordinates": {"lat": lat, "lon": lon},
            "forecast_days": days,
            "forecast": forecast,
            "farming_advisory": advisory if advisory else ["✅ Weather looks stable for farming this week."]
        }

    except Exception as e:
        return {"error": f"Weather fetch failed: {str(e)}"}


# ─────────────────────────────────────────────
# TOOL 3: Government Schemes (static JSON)
# ─────────────────────────────────────────────

SCHEMES_DATA = [
    {
        "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "type": "Central",
        "benefit": "₹6,000/year direct income support in 3 installments of ₹2,000",
        "eligibility": "All landholding farmer families with cultivable land",
        "how_to_apply": "Visit nearest CSC (Common Service Centre) or pmkisan.gov.in",
        "documents": ["Aadhaar card", "Land records (Khasra/Khatauni)", "Bank account details"],
        "helpline": "155261 / 011-23381092",
        "portal": "https://pmkisan.gov.in",
    },
    {
        "name": "PM Fasal Bima Yojana (PMFBY)",
        "type": "Central",
        "benefit": "Crop insurance at very low premium — 2% for Kharif, 1.5% for Rabi",
        "eligibility": "All farmers growing notified crops (loanee & non-loanee both)",
        "how_to_apply": "Through bank, CSC, or pmfby.gov.in before sowing season",
        "documents": ["Aadhaar", "Land records", "Bank passbook", "Sowing certificate"],
        "helpline": "1800-180-1551",
        "portal": "https://pmfby.gov.in",
    },
    {
        "name": "Kisan Credit Card (KCC)",
        "type": "Central",
        "benefit": "Short-term credit at 4% interest rate (subsidized) up to ₹3 lakh",
        "eligibility": "All farmers, sharecroppers, tenant farmers, SHGs",
        "how_to_apply": "Apply at nearest bank branch (SBI, PNB, Cooperative Banks etc.)",
        "documents": ["Aadhaar", "Land records", "Passport photo", "Income proof"],
        "helpline": "Contact nearest nationalized bank",
        "portal": "https://www.nabard.org",
    },
    {
        "name": "PM Krishi Sinchai Yojana (PMKSY)",
        "type": "Central",
        "benefit": "Subsidy on micro-irrigation (drip/sprinkler) — up to 55% for small farmers",
        "eligibility": "Farmers with own land, priority to small & marginal farmers",
        "how_to_apply": "Apply through state agriculture department or pmksy.gov.in",
        "documents": ["Aadhaar", "Land records", "Bank details"],
        "helpline": "1800-180-1551",
        "portal": "https://pmksy.gov.in",
    },
    {
        "name": "eNAM (National Agriculture Market)",
        "type": "Central",
        "benefit": "Sell crops online across India at better prices, bypass middlemen",
        "eligibility": "Any farmer registered with local APMC mandi",
        "how_to_apply": "Register at enam.gov.in or through local mandi office",
        "documents": ["Aadhaar", "Bank account", "APMC registration"],
        "helpline": "1800-270-0224",
        "portal": "https://enam.gov.in",
    },
    {
        "name": "Soil Health Card Scheme",
        "type": "Central",
        "benefit": "Free soil testing + personalized fertilizer recommendations",
        "eligibility": "All farmers across India",
        "how_to_apply": "Contact local agriculture department or soilhealth.dac.gov.in",
        "documents": ["Aadhaar", "Land details"],
        "helpline": "011-23382012",
        "portal": "https://soilhealth.dac.gov.in",
    },
    {
        "name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "type": "Central",
        "benefit": "₹50,000/ha over 3 years for organic farming conversion",
        "eligibility": "Farmers willing to adopt organic farming in clusters of 20+ ha",
        "how_to_apply": "Through state agriculture department",
        "documents": ["Aadhaar", "Land records", "Group formation certificate"],
        "helpline": "Contact state agriculture department",
        "portal": "https://pgsindia-ncof.gov.in",
    },
    {
        "name": "Agriculture Infrastructure Fund (AIF)",
        "type": "Central",
        "benefit": "Loans up to ₹2 crore at 3% interest subsidy for farm infrastructure",
        "eligibility": "FPOs, PACS, farmer groups, agri-entrepreneurs",
        "how_to_apply": "Apply at agriinfra.dac.gov.in",
        "documents": ["Aadhaar", "Business plan", "Land/lease documents", "Bank details"],
        "helpline": "1800-3000-2000",
        "portal": "https://agriinfra.dac.gov.in",
    },
]

@mcp.tool()
async def get_schemes(
    query: str = "",
    scheme_type: str = "all"
) -> dict:
    """
    Get information about government agricultural schemes for Indian farmers.

    Args:
        query: Search keyword (e.g. "insurance", "loan", "irrigation", "organic")
        scheme_type: "central", "state", or "all" (default "all")

    Returns:
        List of matching schemes with benefits, eligibility and how to apply
    """
    results = SCHEMES_DATA

    if scheme_type.lower() != "all":
        results = [s for s in results if s["type"].lower() == scheme_type.lower()]

    if query:
        query_lower = query.lower()
        keywords = query_lower.split()
        filtered = []
        for scheme in results:
            text = (scheme["name"] + " " + scheme["benefit"] + " " + scheme["eligibility"]).lower()
            if any(kw in text for kw in keywords):
                filtered.append(scheme)
        results = filtered if filtered else results  # fallback to all if no match

    return {
        "total_schemes": len(results),
        "query": query,
        "schemes": results
    }


# ─────────────────────────────────────────────
# Run the MCP server
# ─────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run()
