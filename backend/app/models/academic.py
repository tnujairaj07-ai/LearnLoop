from datetime import datetime

from app.extensions import db


class Subject(db.Model):
    __tablename__ = "subjects"
    __table_args__ = (
        db.CheckConstraint(
            "category IN ('core', 'skill', 'enrichment', 'elective', 'practical')",
            name="ck_subjects_category",
        ),
        db.CheckConstraint(
            "status IN ('active', 'coming_soon', 'archived')",
            name="ck_subjects_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(30), default="core", nullable=False)
    curriculum_label = db.Column(db.String(100))
    status = db.Column(db.String(20), default="active", nullable=False)
    badge_label = db.Column(db.String(50))
    icon = db.Column(db.String(20))
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
    unit_name = db.Column(db.String(120))
    common_mistake_tip = db.Column(db.Text)
    is_pilot = db.Column(db.Boolean, default=True, nullable=False)
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
        db.CheckConstraint(
            "cognitive_domain IN ('conceptual', 'fluency', 'problem_solving', 'reasoning', 'accuracy')",
            name="ck_skills_cognitive_domain",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    cognitive_domain = db.Column(db.String(30), default="conceptual", nullable=False)
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


class SubjectBookmark(db.Model):
    """Stores student-bookmarked subjects on the learning roadmap."""

    __tablename__ = "subject_bookmarks"
    __table_args__ = (
        db.UniqueConstraint("user_id", "subject_id", name="uq_subject_bookmarks_user_subject"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ResourceView(db.Model):
    """Tracks when a student opens or marks a learning resource as reviewed."""

    __tablename__ = "resource_views"
    __table_args__ = (
        db.UniqueConstraint("student_id", "resource_id", name="uq_resource_views_student_resource"),
        db.CheckConstraint("duration_seconds >= 0", name="ck_resource_views_duration"),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource_id = db.Column(
        db.Integer, db.ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    duration_seconds = db.Column(db.Integer, default=0, nullable=False)
    reviewed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
