import logging
import os

from flask import Flask

import app.models
from app.config import config_by_name
from app.extensions import cors, db, jwt, migrate
from app.routes.admin_routes import admin_bp
from app.routes.assessment_routes import assessment_bp
from app.routes.auth_routes import auth_bp
from app.routes.content_routes import content_bp
from app.routes.health_routes import health_bp
from app.routes.student_routes import student_bp
from app.routes.teacher_routes import teacher_bp
from app.seed import register_seed_commands
from app.services.auth_service import is_token_revoked
from app.utils.errors import register_error_handlers
from app.utils.jwt_callbacks import register_jwt_callbacks


def create_app(config_name=None):
    selected_config = config_name or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)

    config_class = config_by_name.get(selected_config, config_by_name["development"])
    app.config.from_object(config_class)

    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        raise RuntimeError(
            "DATABASE_URL is missing. Add your database connection URL (e.g. MySQL) to backend/.env."
        )

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    register_jwt_callbacks(jwt, is_token_revoked)

    cors.init_app(
        app,
        resources={r"/api/*": {"origins": [app.config["FRONTEND_URL"]]}},
        supports_credentials=False,
    )

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(content_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(assessment_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(teacher_bp)
    register_seed_commands(app)

    register_error_handlers(app)
    configure_logging(app)

    return app


def configure_logging(app):
    if not app.debug:
        logging.basicConfig(level=logging.INFO)
