from datetime import datetime

from app.extensions import db


class ErrorTag(db.Model):
    __tablename__ = "error_tags"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Question(db.Model):
    __tablename__ = "questions"
    __table_args__ = (
        db.UniqueConstraint("topic_id", "question_text", name="uq_questions_topic_text"),
        db.CheckConstraint("difficulty BETWEEN 1 AND 3", name="ck_questions_difficulty"),
        db.CheckConstraint(
            "question_type IN ('mcq', 'numeric', 'short_text')",
            name="ck_questions_type",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id", ondelete="SET NULL"), index=True)
    question_type = db.Column(db.String(20), nullable=False)
    question_text = db.Column(db.String(500), nullable=False)
    options_json = db.Column(db.JSON)
    correct_answer = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text, nullable=False)
    hint = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Integer, default=1, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    approved = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    topic = db.relationship("Topic", back_populates="questions")
    error_tags = db.relationship(
        "QuestionErrorTag",
        back_populates="question",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class QuestionErrorTag(db.Model):
    __tablename__ = "question_error_tags"
    __table_args__ = (
        db.UniqueConstraint("question_id", "error_tag_id", name="uq_question_error_tags_pair"),
    )

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(
        db.Integer, db.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    error_tag_id = db.Column(
        db.Integer, db.ForeignKey("error_tags.id", ondelete="CASCADE"), nullable=False, index=True
    )
    option_or_pattern = db.Column(db.String(100))

    question = db.relationship("Question", back_populates="error_tags")
    error_tag = db.relationship("ErrorTag")
