from flask import Blueprint, request, jsonify, current_app, make_response
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
import jwt
import datetime
from functools import wraps
import os
from .models import db,User
from datetime import datetime,timezone,timedelta

# Create a Blueprint
main = Blueprint("main", __name__)

#To verify whether a user is authorized to access a resource or not
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.cookies.get("token")

        if not token:
            return {"error": "Unauthorized"}, 401

        try:
            data = jwt.decode(
                token,
                current_app.config["JWT_SECRET"],
                algorithms=["HS256"]
            )
            request.user = data
        except jwt.ExpiredSignatureError:
            return {"error": "Token expired"}, 401
        except jwt.InvalidTokenError:
             return {"error": "Invalid token"}, 401

        return f(*args, **kwargs)

    return wrapper


@main.route("/auth/google", methods=["POST"])
def google_auth():
    data = request.get_json()
    token = data.get("token")

    try:
        # ✅ Verify Google token
        idinfo = id_token.verify_oauth2_token(
            token,
            grequests.Request(),
            current_app.config["GOOGLE_CLIENT_ID"]
        )

        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name")

        # 🧠 STEP 1: Check user in DB
        user = User.query.filter_by(google_id=google_id).first()

        # 🧠 STEP 2: If not exists → create
        if not user:
            user = User(
                email=email,
                name=name,
                google_id=google_id
            )
            db.session.add(user)
            db.session.commit()


        # ✅ Create JWT
        payload = {
            "user_id": user.id,     # ✅ DB ID (important)
            "email": email,
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        }

        jwt_token = jwt.encode(
            payload,
            current_app.config["JWT_SECRET"],
            algorithm="HS256"
        )

        # ✅ Store in COOKIE (best practice)
        response = make_response({
            "message": "Login successful",
            "user": {
                "email": email,
                "name": name
            }
        })

        response.set_cookie(
            "token",
            jwt_token,
            httponly=True,
            secure=False,  # ⚠️ True in production (HTTPS)
            samesite="Lax"
        )

        return response

    except Exception as e:
        print("Google Auth Error:", e)
        return jsonify({"error": "Invalid token"}), 401

@main.route("/profile")
@login_required
def profile():
    return jsonify({
        "message": "Authorized",
        "user": request.user
    })

@main.route("/status")
def status():
    return jsonify({"status": "ok", "message": "NovaGlobe API is running"})

@main.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "").strip() if data else ""

    if not query:
        return jsonify({"success": False, "error": "No query provided"}), 400

    from .services.search_service import semantic_search
    result = semantic_search(query)

    status_code = 200 if result["success"] else 422
    return jsonify(result), status_code

@main.route("/agent/chat", methods=["POST"])
def agent_chat():
    data = request.get_json()
    message = data.get("message", "").strip() if data else ""
    session_id = data.get("session_id", "anonymous")
    
    # Check if user is logged in
    user_id = None
    token = request.cookies.get("token")
    if token:
        try:
            from flask import current_app
            import jwt
            decoded = jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])
            user_id = decoded.get("user_id")
        except:
            pass
            
    from .services.agent_service import process_agent_message
    result = process_agent_message(user_id, session_id, message)

    return jsonify(result), 200

@main.route("/agent/history", methods=["GET"])
def agent_history():
    session_id = request.args.get("session_id", "anonymous")
    from .services.agent_service import get_chat_history
    history = get_chat_history(session_id)
    return jsonify({"history": history}), 200
