from datetime import datetime

from app.extensions import db


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.Text)
    data_source = db.Column(db.String(32), default="manual", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    topics = db.relationship(
        "Topic",
        back_populates="subject",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    teacher_assignments = db.relationship(
        "TeacherAssignment",
        back_populates="subject",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class Topic(db.Model):
    __tablename__ = "topics"
    __table_args__ = (
        db.UniqueConstraint("subject_id", "title", name="uq_topics_subject_title"),
        db.UniqueConstraint("subject_id", "order_index", name="uq_topics_subject_order"),
        db.CheckConstraint(
            "mastery_threshold >= 0 AND mastery_threshold <= 100",
            name="ck_topics_mastery_threshold",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    order_index = db.Column(db.Integer, nullable=False)
    mastery_threshold = db.Column(db.Float, default=80.0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    subject = db.relationship("Subject", back_populates="topics")
    skills = db.relationship(
        "Skill",
        back_populates="topic",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    resources = db.relationship(
        "Resource",
        back_populates="topic",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    questions = db.relationship(
        "Question",
        back_populates="topic",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class Skill(db.Model):
    __tablename__ = "skills"
    __table_args__ = (
        db.UniqueConstraint("topic_id", "name", name="uq_skills_topic_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    topic = db.relationship("Topic", back_populates="skills")


class Prerequisite(db.Model):
    __tablename__ = "prerequisites"
    __table_args__ = (
        db.UniqueConstraint("topic_id", "required_topic_id", name="uq_prerequisites_pair"),
        db.CheckConstraint(
            "topic_id <> required_topic_id", name="ck_prerequisites_distinct_topics"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    required_topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )


class Resource(db.Model):
    __tablename__ = "resources"
    __table_args__ = (
        db.UniqueConstraint("topic_id", "title", name="uq_resources_topic_title"),
        db.CheckConstraint("difficulty BETWEEN 1 AND 3", name="ck_resources_difficulty"),
    )

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = db.Column(db.String(150), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)
    url_or_path = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    difficulty = db.Column(db.Integer, default=1, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    approved = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    topic = db.relationship("Topic", back_populates="resources")
