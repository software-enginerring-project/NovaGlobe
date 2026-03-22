import os

class Config:
    CESIUM_ION_TOKEN = os.getenv("CESIUM_ION_TOKEN")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")