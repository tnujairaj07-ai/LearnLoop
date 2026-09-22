from datetime import datetime

from app.extensions import db


class Assessment(db.Model):
    __tablename__ = "assessments"
    __table_args__ = (
        db.UniqueConstraint("title", "class_id", name="uq_assessments_title_class"),
        db.CheckConstraint(
            "assessment_type IN ('diagnostic', 'practice', 'reassessment')",
            name="ck_assessments_type",
        ),
        db.CheckConstraint(
            "status IN ('draft', 'published', 'closed')", name="ck_assessments_status"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    assessment_type = db.Column(db.String(50), nullable=False)
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="SET NULL"), index=True)
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    available_from = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    available_until = db.Column(db.DateTime)
    status = db.Column(db.String(20), default="draft", nullable=False)
    data_source = db.Column(db.String(32), default="manual", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    questions = db.relationship(
        "AssessmentQuestion",
        back_populates="assessment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    attempts = db.relationship(
        "Attempt",
        back_populates="assessment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class AssessmentQuestion(db.Model):
    __tablename__ = "assessment_questions"
    __table_args__ = (
        db.UniqueConstraint("assessment_id", "question_id", name="uq_assessment_questions_pair"),
        db.UniqueConstraint("assessment_id", "order_index", name="uq_assessment_questions_order"),
    )

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(
        db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id = db.Column(
        db.Integer, db.ForeignKey("questions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    order_index = db.Column(db.Integer, nullable=False)
    points = db.Column(db.Float, default=1.0, nullable=False)

    assessment = db.relationship("Assessment", back_populates="questions")
    question = db.relationship("Question")


class Attempt(db.Model):
    __tablename__ = "attempts"
    __table_args__ = (
        db.UniqueConstraint("assessment_id", "student_id", name="uq_attempts_assessment_student"),
        db.CheckConstraint(
            "attempt_type IN ('diagnostic', 'practice', 'reassessment')",
            name="ck_attempts_type",
        ),
        db.CheckConstraint(
            "status IN ('in_progress', 'submitted', 'scored', 'processing_failed')",
            name="ck_attempts_status",
        ),
        db.CheckConstraint("score IS NULL OR score >= 0", name="ck_attempts_score"),
        db.CheckConstraint(
            "percentage IS NULL OR (percentage >= 0 AND percentage <= 100)",
            name="ck_attempts_percentage",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(
        db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(30), default="in_progress", nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = db.Column(db.DateTime)
    score = db.Column(db.Float)
    percentage = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    assessment = db.relationship("Assessment", back_populates="attempts")
    student = db.relationship("User", back_populates="attempts")
    answers = db.relationship(
        "Answer",
        back_populates="attempt",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class Answer(db.Model):
    __tablename__ = "answers"
    __table_args__ = (
        db.UniqueConstraint("attempt_id", "question_id", name="uq_answers_attempt_question"),
        db.CheckConstraint(
            "time_spent_seconds >= 0", name="ck_answers_time_spent_seconds"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(
        db.Integer, db.ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id = db.Column(
        db.Integer, db.ForeignKey("questions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    answer_text = db.Column(db.Text)
    is_correct = db.Column(db.Boolean)
    time_spent_seconds = db.Column(db.Integer, default=0, nullable=False)
    detected_error_tag_id = db.Column(db.Integer, db.ForeignKey("error_tags.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    attempt = db.relationship("Attempt", back_populates="answers")
    question = db.relationship("Question")
