from flask import Blueprint, jsonify

# Create a Blueprint
main = Blueprint("main", __name__)

@main.route("/api/status")
def status():
    return jsonify({"status": "ok", "message": "NovaGlobe API is running"})
