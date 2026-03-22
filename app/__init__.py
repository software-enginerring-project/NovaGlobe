from flask import Flask
from flask_cors import CORS
from config import Config
from .models import db
from flask_migrate import Migrate


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    migrate = Migrate(app,db)

    CORS(app,supports_credentials=True)

    from .routes import main
    app.register_blueprint(main)

    return app
