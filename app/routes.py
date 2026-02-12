from flask import Blueprint, render_template,current_app

# Create a Blueprint
main = Blueprint("main", __name__)

@main.route("/")
def home():
    return render_template("front.html",CESIUM_TOKEN=current_app.config["CESIUM_ION_TOKEN"])

@main.route("/login")
def front():
    return render_template("login.html")

@main.route("/profile")
def profile():
    return render_template("profile2.html")
