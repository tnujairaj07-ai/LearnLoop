"""
Audit Service

Provides minimal, immutable, non-sensitive audit logging for governance,
accountability, and regulatory compliance.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from flask import current_app, has_request_context, request
from app.extensions import db
from app.models.governance import AuditLog

# Keys to strictly redact from audit metadata
SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "authorization",
    "answer_key",
}


class AuditService:
    @staticmethod
    def _sanitize_metadata(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Deeply sanitize metadata dictionary to ensure no sensitive credentials or PII leak."""
        if not data or not isinstance(data, dict):
            return {}

        sanitized = {}
        for key, value in data.items():
            if any(s in key.lower() for s in SENSITIVE_KEYS):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = AuditService._sanitize_metadata(value)
            elif isinstance(value, (list, tuple)):
                sanitized[key] = [
                    AuditService._sanitize_metadata(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        return sanitized

    @classmethod
    def log_event(
        cls,
        action: str,
        entity_type: str,
        entity_id: Optional[Any] = None,
        actor_id: Optional[int] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        commit: bool = True,
    ) -> Optional[AuditLog]:
        """
        Record an immutable audit log entry.
        
        Args:
            action: Descriptive action string (e.g. 'assessment.submit', 'report.generate')
            entity_type: Type of the entity affected (e.g. 'Attempt', 'Report')
            entity_id: Identifier of the target entity
            actor_id: ID of the user performing the action
            metadata_json: Contextual non-sensitive payload
            request_id: Optional correlation/request ID
            commit: Whether to commit the transaction immediately
        """
        try:
            # Auto-resolve request_id if available in request context
            if not request_id and has_request_context():
                request_id = request.headers.get("X-Request-ID")

            sanitized_meta = cls._sanitize_metadata(metadata_json)
            str_entity_id = str(entity_id) if entity_id is not None else None

            log_entry = AuditLog(
                actor_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=str_entity_id,
                metadata_json=sanitized_meta,
                request_id=request_id,
                created_at=datetime.utcnow(),
            )
            db.session.add(log_entry)
            if commit:
                db.session.commit()
            return log_entry
        except Exception as e:
            if has_request_context():
                current_app.logger.error(f"Audit log failed for {action}: {e}")
            db.session.rollback()
            return None

    @classmethod
    def list_audit_logs(
        cls,
        actor_id: Optional[int] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List audit logs with filtering and pagination.
        """
        query = AuditLog.query

        if actor_id is not None:
            query = query.filter_by(actor_id=actor_id)
        if action:
            query = query.filter(AuditLog.action.ilike(f"%{action}%"))
        if entity_type:
            query = query.filter_by(entity_type=entity_type)
        if entity_id:
            query = query.filter_by(entity_id=str(entity_id))

        total_count = query.count()
        logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

        results = [
            {
                "id": log.id,
                "actor_id": log.actor_id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "metadata": log.metadata_json,
                "request_id": log.request_id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
        return results, total_count
