import os
import re
import json
import requests
from datetime import datetime, timezone
from flask import current_app
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from app.models import db, ChatMessage

def _get_llm():
    from langchain_groq import ChatGroq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY for Nova Guide")
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        api_key=api_key,
    )

_geocoder = Nominatim(user_agent="novaglobe-agent/1.0", timeout=5)

def _geocode(location_name: str):
    try:
        result = _geocoder.geocode(location_name, exactly_one=True)
        if result:
            return {
                "lat": result.latitude, 
                "lng": result.longitude,
                "bbox": result.raw.get("boundingbox") # [south, north, west, east]
            }
    except Exception as e:
        print(f"Agent Geocoding error: {e}")
    return None

@tool
def get_location_weather(location_name: str) -> str:
    """Fetch the real-time current weather and climate for a specific location using OpenWeatherMap."""
    geo = _geocode(location_name)
    if not geo:
        return f"Could not find coordinates for {location_name}"
    
    api_key = current_app.config.get("OPENWEATHER_API_KEY")
    if not api_key:
        return "Weather API key not configured on server."
    
    try:
        url = "https://api.openweathermap.org/data/2.5/weather"
        res = requests.get(url, params={"lat": geo["lat"], "lon": geo["lng"], "appid": api_key, "units": "metric"}, timeout=8)
        data = res.json()
        desc = data.get("weather", [{}])[0].get("description", "")
        temp = data.get("main", {}).get("temp", "")
        humidity = data.get("main", {}).get("humidity", "")
        return f"Current Weather in {location_name}: {desc}, Temperature: {temp}°C, Humidity: {humidity}%"
    except Exception as e:
        return f"Error fetching weather: {str(e)}"

@tool
def get_location_news(location_name: str) -> str:
    """Fetch the latest news headlines and events for a specific location using NewsAPI."""
    api_key = current_app.config.get("NEWS_API_KEY")
    if not api_key:
        return "News API key not configured on server."
    
    try:
        url = "https://newsapi.org/v2/everything"
        res = requests.get(url, params={"q": location_name, "apiKey": api_key, "pageSize": 3, "sortBy": "publishedAt"}, timeout=8)
        data = res.json()
        articles = data.get("articles", [])
        if not articles:
            return f"No recent news found for {location_name}."
        news_text = "\n".join([f"- {a.get('title', 'Headline')}" for a in articles])
        return f"Recent news in {location_name}:\n{news_text}"
    except Exception as e:
        return f"Error fetching news: {str(e)}"


def _convert_history(history_records):
    messages = []
    for msg in history_records:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        else:
            messages.append(AIMessage(content=msg.content))
    return messages

def process_agent_message(user_id, session_id, message):
    if not message or not message.strip():
        return {"error": "Empty message"}

    user_msg = ChatMessage(user_id=user_id, session_id=session_id, role="user", content=message)
    db.session.add(user_msg)
    db.session.commit()
    
    history_records = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    chat_history = _convert_history(history_records[-10:])
    
    tools = [get_location_weather, get_location_news]

    try:
        llm = _get_llm().bind_tools(tools)
        system_msg = SystemMessage(content="""You are a highly creative and enthusiastic travel guide AI inside the NovaGlobe application.
Your goal is to converse with the user, answer questions about the world, use your tools to provide latest news and climate, and suggest amazing places to explore.

Rules:
- Keep it concise, engaging, and friendly!
- Do not repeat exact coordinates to the user.
- If you strongly suggest a specific place or the user asks to go somewhere, you MUST end your final response with a special tag: [LOCATION: Canonical Place Name | A short exciting sentence about it]
- Ensure the Canonical Place Name perfectly matches real-world map search syntax (e.g. 'Eiffel Tower, Paris, France' or 'Texas, USA' instead of vague names).
Example tag: [LOCATION: Tokyo, Japan | A vibrant metropolis blending neon-lit skyscrapers with historic temples.]
""")
        messages = [system_msg] + chat_history + [HumanMessage(content=message)]
        
        response = llm.invoke(messages)
        messages.append(response)
        
        # --- Fallback for Llama-3 JSON bleeding into content ---
        if not response.tool_calls and response.content and "get_location" in response.content:
            try:
                import json
                cleaned_content = response.content.strip()
                if cleaned_content.startswith("{") and cleaned_content.endswith("}"):
                    tc_data = json.loads(cleaned_content)
                    if "name" in tc_data and "parameters" in tc_data:
                        # Manually simulate a native tool call
                        response.tool_calls = [{
                            "name": tc_data["name"],
                            "args": tc_data["parameters"],
                            "id": "call_fallback_" + tc_data["name"]
                        }]
            except Exception as e:
                print("Fallback JSON parse failed", e)
        # -------------------------------------------------------

        if response.tool_calls:
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                
                if tool_name == "get_location_weather":
                    res = get_location_weather.invoke(tool_args)
                elif tool_name == "get_location_news":
                    res = get_location_news.invoke(tool_args)
                else:
                    res = "Tool not found."
                
                messages.append(ToolMessage(content=str(res), tool_call_id=tool_call["id"]))
            
            response = llm.invoke(messages)

        reply_text = response.content.strip()
        
        location_name = None
        location_info = None
        
        match = re.search(r"\[LOCATION:\s*([^|]+)\s*\|\s*([^\]]+)\]", reply_text, re.IGNORECASE)
        if match:
            location_name = match.group(1).strip()
            location_info = match.group(2).strip()
            reply_text = reply_text[:match.start()].strip()
        else:
            match2 = re.search(r"\[LOCATION:\s*([^\]]+)\]", reply_text, re.IGNORECASE)
            if match2:
                location_name = match2.group(1).strip()
                location_info = "A fascinating location to explore."
                reply_text = reply_text[:match2.start()].strip()
        
        agent_msg = ChatMessage(user_id=user_id, session_id=session_id, role="agent", content=reply_text)
        db.session.add(agent_msg)
        db.session.commit()

        action = None
        if location_name:
            geo = _geocode(location_name)
            if geo:
                action = {**geo, "focusName": location_name, "focusInfo": location_info}

        return {"reply": reply_text, "action": action}
    except Exception as e:
        db.session.rollback()
        print(f"Agent error: {e}")
        fallback_reply = "I am having a temporary connection issue, but I am still here. Please try again in a moment."

        try:
            agent_msg = ChatMessage(user_id=user_id, session_id=session_id, role="agent", content=fallback_reply)
            db.session.add(agent_msg)
            db.session.commit()
        except:
            db.session.rollback()

        return {"reply": fallback_reply, "action": None, "fallback": True}

def get_chat_history(session_id):
    records = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    return [{"role": msg.role, "content": msg.content, "timestamp": msg.timestamp.isoformat()} for msg in records]

def generate_location_comparison(place1: str, place2: str) -> dict:
    try:
        weather1 = get_location_weather.invoke({"location_name": place1})
        news1 = get_location_news.invoke({"location_name": place1})
        weather2 = get_location_weather.invoke({"location_name": place2})
        news2 = get_location_news.invoke({"location_name": place2})
        
        llm = _get_llm()
        
        prompt = f"""You are an expert global analyst for NovaGlobe. Compare these two locations based on the provided current climate and news data.
        
Location A: {place1}
Weather: {weather1}
News: {news1}

Location B: {place2}
Weather: {weather2}
News: {news2}

Write a detailed, structured, and engaging report.
Include sections like "Climate Differences", "Recent Events", and a "Final Verdict".
Format output strictly in Markdown so it renders beautifully in a UI. Be concise but comprehensive. Do not include unparsed placeholders."""

        response = llm.invoke([SystemMessage(content=prompt)])
        
        return {
            "success": True,
            "comparison": response.content,
            "place1": place1,
            "place2": place2
        }
    except Exception as e:
        print(f"Comparison generation error: {e}")
        return {"success": False, "error": str(e)}
