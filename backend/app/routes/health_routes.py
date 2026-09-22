from flask import Blueprint
from sqlalchemy import text

from app.extensions import db
from app.utils.responses import error_response, success_response


health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health_check():
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        return error_response(
            message="Backend is running, but the database connection failed.",
            status_code=503,
        )

    return success_response(
        data={
            "status": "healthy",
            "service": "LearnLoop API",
            "database": "connected",
        },
        message="Backend and database are running",
    )