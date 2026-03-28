"""
Semantic Search Service using LangChain + Groq (Llama 3) + Nominatim Geocoding.

Flow:
  1. User query → LLM extracts the most relevant location name
  2. Location name → Nominatim geocoder → (lat, lng)
  3. Return structured result to the frontend
"""

import json
import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError


# ── LLM Setup ──────────────────────────────────────────────────────────────────

def _get_llm():
    """Create a Groq-backed Llama 3 instance."""
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY"),
    )


# ── Prompt ─────────────────────────────────────────────────────────────────────

EXTRACT_LOCATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a geographic search assistant for a globe visualization application called NovaGlobe.

Given the user's natural‑language query, extract the single most relevant **geographic location** they are referring to.

Reply with ONLY valid JSON (no markdown fences), using this exact schema:
{{
  "location_name": "<canonical place name suitable for geocoding>",
  "display_name": "<human‑friendly name to show in the UI>",
  "description": "<one‑sentence summary of why this location is relevant to the query>",
  "confidence": <float 0‑1 indicating how confident you are>
}}

Rules:
- If the query is clearly about a specific place or landmark, extract it.
- If the query describes a region (e.g. "Amazon rainforest"), return the most representative central point name.
- If the query mentions multiple locations, pick the PRIMARY one.
- If no geographic location can be identified, set location_name to null.
"""),
    ("human", "{query}"),
])


# ── Geocoder ───────────────────────────────────────────────────────────────────

_geocoder = Nominatim(user_agent="novaglobe-search/1.0", timeout=5)


def _geocode(location_name: str) -> dict | None:
    """Geocode a location name → {lat, lng, full_name}."""
    try:
        result = _geocoder.geocode(location_name, exactly_one=True)
        if result:
            return {
                "lat": result.latitude,
                "lng": result.longitude,
                "full_name": result.address,
            }
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"Geocoding error: {e}")
    return None


# ── Public API ─────────────────────────────────────────────────────────────────

def semantic_search(query: str) -> dict:
    """
    Main entry point.
    Returns:
      {
        "success": True/False,
        "location": { "name", "display_name", "description", "lat", "lng", "confidence" } | None,
        "error": "..." | None
      }
    """
    if not query or not query.strip():
        return {"success": False, "location": None, "error": "Empty query"}

    if not os.getenv("GROQ_API_KEY"):
        return {"success": False, "location": None, "error": "GROQ_API_KEY not set"}

    try:
        # Step 1: Ask the LLM to extract a location
        llm = _get_llm()
        chain = EXTRACT_LOCATION_PROMPT | llm
        response = chain.invoke({"query": query})

        # Parse LLM response
        raw = response.content.strip()
        # Strip markdown code fences if the model adds them anyway
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]

        parsed = json.loads(raw)

        location_name = parsed.get("location_name")
        if not location_name:
            return {
                "success": False,
                "location": None,
                "error": "Could not identify a location from your query",
            }

        # Step 2: Geocode the extracted location
        geo = _geocode(location_name)
        if not geo:
            return {
                "success": False,
                "location": None,
                "error": f"Could not find coordinates for '{location_name}'",
            }

        return {
            "success": True,
            "location": {
                "name": location_name,
                "display_name": parsed.get("display_name", location_name),
                "description": parsed.get("description", ""),
                "lat": geo["lat"],
                "lng": geo["lng"],
                "full_name": geo["full_name"],
                "confidence": parsed.get("confidence", 0.5),
            },
            "error": None,
        }

    except json.JSONDecodeError as e:
        return {"success": False, "location": None, "error": f"LLM response parse error: {e}"}
    except Exception as e:
        print(f"Search service error: {e}")
        return {"success": False, "location": None, "error": str(e)}
