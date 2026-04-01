from flask import Flask
from flask_cors import CORS
from config import Config
from .models import db
from flask_migrate import Migrate
from dotenv import load_dotenv


def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    migrate = Migrate(app,db)

    CORS(app,supports_credentials=True)

    from .routes import main
    app.register_blueprint(main)

    # Ensure core tables exist in local/dev runs even before migrations are applied.
    with app.app_context():
        db.create_all()

    return app
