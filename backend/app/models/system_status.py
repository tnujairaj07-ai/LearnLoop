from datetime import datetime

from app.extensions import db


class SystemStatus(db.Model):
    __tablename__ = "system_status"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
    )