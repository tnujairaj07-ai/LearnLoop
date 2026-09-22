from datetime import datetime

from app.extensions import db


class Intervention(db.Model):
    __tablename__ = "interventions"
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('suggested', 'reviewed', 'assigned', 'in_progress', "
            "'reassessment_pending', 'completed', 'closed', 'dismissed')",
            name="ck_interventions_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id", ondelete="SET NULL"))
    error_pattern_flag_id = db.Column(
        db.Integer, db.ForeignKey("error_pattern_flags.id", ondelete="SET NULL")
    )
    title = db.Column(db.String(150), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    evidence_json = db.Column(db.JSON, default=dict, nullable=False)
    recommended_action = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default="suggested", nullable=False)
    reassessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    assigned_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    students = db.relationship(
        "InterventionStudent",
        back_populates="intervention",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class InterventionStudent(db.Model):
    __tablename__ = "intervention_students"
    __table_args__ = (
        db.UniqueConstraint(
            "intervention_id", "student_id", name="uq_intervention_students_pair"
        ),
        db.CheckConstraint(
            "status IN ('assigned', 'in_progress', 'completed', 'reassessment_pending', 'closed')",
            name="ck_intervention_students_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    intervention_id = db.Column(
        db.Integer, db.ForeignKey("interventions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    before_mastery = db.Column(db.Float)
    after_mastery = db.Column(db.Float)
    outcome = db.Column(db.String(50))
    status = db.Column(db.String(30), default="assigned", nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)

    intervention = db.relationship("Intervention", back_populates="students")
    student = db.relationship("User")
