import os
import json
from datetime import datetime, timezone
from langchain_core.prompts import ChatPromptTemplate
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from app.models import db, ChatMessage

def _get_llm():
    """Create a Groq-backed Llama 3 instance for the agent."""
    from langchain_groq import ChatGroq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY for Nova Guide")

    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        api_key=api_key,
    )

AGENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a highly creative and enthusiastic travel guide AI inside the NovaGlobe application.
Your goal is to converse with the user, answer questions about the world, and suggest amazing places to explore.

Whenever the user asks to go somewhere, or asks about a place, or you strongly suggest a specific place,
you MUST extract that single most relevant primary geographic location name.
Otherwise, if the conversation is general and doesn't warrant flying the globe, leave the location_name as null.

Reply with ONLY valid JSON (no markdown fences, just the raw JSON object), using this exact schema:
{{
  "reply": "<your conversational text response to the user>",
  "location_name": "<canonical place name suitable for geocoding, or null>",
  "location_info": "<2-3 engaging sentences describing the history, significance, or cool facts about the location, or null>"
}}

Rules for reply:
- Keep it concise, engaging, and friendly!
- Do not repeat the exact coordinates to the user.
- If you set a location_name, tell the user you are taking them there.
"""),
    ("human", "Conversation History:\n{history}\n\nUser: {message}"),
])

_geocoder = Nominatim(user_agent="novaglobe-agent/1.0", timeout=5)

def _geocode(location_name: str):
    """Geocode a location name → {lat, lng}."""
    try:
        result = _geocoder.geocode(location_name, exactly_one=True)
        if result:
            return {
                "lat": result.latitude,
                "lng": result.longitude,
            }
    except Exception as e:
        print(f"Agent Geocoding error: {e}")
    return None

def process_agent_message(user_id, session_id, message):
    if not message or not message.strip():
        return {"error": "Empty message"}

    # Save user message
    user_msg = ChatMessage(user_id=user_id, session_id=session_id, role="user", content=message)
    db.session.add(user_msg)
    
    # Retrieve history
    history_records = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    history_text = "\n".join([f"{msg.role.capitalize()}: {msg.content}" for msg in history_records[-10:]]) # last 10 messages

    try:
        llm = _get_llm()
        chain = AGENT_PROMPT | llm
        response = chain.invoke({"history": history_text, "message": message})
        
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]
            
        parsed = json.loads(raw)
        
        reply_text = parsed.get("reply", "I am not sure how to respond to that.")
        location_name = parsed.get("location_name")
        location_info = parsed.get("location_info")
        
        # Save agent message
        agent_msg = ChatMessage(user_id=user_id, session_id=session_id, role="agent", content=reply_text)
        db.session.add(agent_msg)
        db.session.commit()

        action = None
        if location_name:
            geo = _geocode(location_name)
            if geo:
                action = {**geo, "focusName": location_name, "focusInfo": location_info}

        return {
            "reply": reply_text,
            "action": action
        }
    except Exception as e:
        db.session.rollback()
        print(f"Agent error: {e}")
        fallback_reply = (
            "I am having a temporary connection issue, but I am still here. "
            "Please try again in a moment."
        )

        try:
            agent_msg = ChatMessage(
                user_id=user_id,
                session_id=session_id,
                role="agent",
                content=fallback_reply
            )
            db.session.add(agent_msg)
            db.session.commit()
        except Exception:
            db.session.rollback()

        return {
            "reply": fallback_reply,
            "action": None,
            "fallback": True
        }

def get_chat_history(session_id):
    records = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    return [{"role": msg.role, "content": msg.content, "timestamp": msg.timestamp.isoformat()} for msg in records]
