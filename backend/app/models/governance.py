from datetime import datetime

from app.extensions import db


class LearningGainRecord(db.Model):
    __tablename__ = "learning_gain_records"
    __table_args__ = (
        db.UniqueConstraint(
            "diagnostic_attempt_id",
            "reassessment_attempt_id",
            name="uq_learning_gain_attempt_pair",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    intervention_id = db.Column(db.Integer, db.ForeignKey("interventions.id", ondelete="SET NULL"))
    diagnostic_attempt_id = db.Column(
        db.Integer, db.ForeignKey("attempts.id", ondelete="RESTRICT"), nullable=False
    )
    reassessment_attempt_id = db.Column(
        db.Integer, db.ForeignKey("attempts.id", ondelete="RESTRICT"), nullable=False
    )
    pre_score = db.Column(db.Float, nullable=False)
    post_score = db.Column(db.Float, nullable=False)
    score_gain = db.Column(db.Float, nullable=False)
    before_mastery = db.Column(db.Float)
    after_mastery = db.Column(db.Float)
    mastery_gain = db.Column(db.Float)
    calculation_version = db.Column(db.String(50), default="gain-v1", nullable=False)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Report(db.Model):
    __tablename__ = "reports"
    __table_args__ = (
        db.CheckConstraint(
            "report_type IN ('student', 'class', 'analytics')", name="ck_reports_type"
        ),
        db.CheckConstraint(
            "status IN ('generated', 'failed', 'archived')", name="ck_reports_status"
        ),
        db.CheckConstraint(
            "student_id IS NOT NULL OR class_id IS NOT NULL", name="ck_reports_has_target"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), index=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), index=True)
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    term_label = db.Column(db.String(50), nullable=False)
    report_type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default="generated", nullable=False)
    payload_json = db.Column(db.JSON, default=dict, nullable=False)
    storage_path = db.Column(db.String(500))
    generated_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    generated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    entity_type = db.Column(db.String(100), nullable=False)
    entity_id = db.Column(db.String(64))
    metadata_json = db.Column(db.JSON, default=dict, nullable=False)
    request_id = db.Column(db.String(64), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
