from datetime import datetime

from app.extensions import db


class MasteryRecord(db.Model):
    __tablename__ = "mastery_records"
    __table_args__ = (
        db.CheckConstraint(
            "mastery_score >= 0 AND mastery_score <= 100", name="ck_mastery_records_score"
        ),
        db.CheckConstraint("evidence_count >= 0", name="ck_mastery_records_evidence"),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mastery_score = db.Column(db.Float, nullable=False)
    accuracy_component = db.Column(db.Float)
    difficulty_component = db.Column(db.Float)
    recency_component = db.Column(db.Float)
    trend_component = db.Column(db.Float)
    evidence_count = db.Column(db.Integer, default=0, nullable=False)
    source_attempt_start_id = db.Column(db.Integer, db.ForeignKey("attempts.id", ondelete="SET NULL"))
    source_attempt_end_id = db.Column(db.Integer, db.ForeignKey("attempts.id", ondelete="SET NULL"))
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    model_version = db.Column(db.String(50), default="heuristic-v1", nullable=False)

    student = db.relationship("User", back_populates="mastery_records")
    topic = db.relationship("Topic")


class ErrorPatternFlag(db.Model):
    __tablename__ = "error_pattern_flags"
    __table_args__ = (
        db.CheckConstraint("evidence_count >= 0", name="ck_error_flags_evidence"),
        db.CheckConstraint("incorrect_count >= 0", name="ck_error_flags_incorrect"),
        db.CheckConstraint("match_count >= 0", name="ck_error_flags_matches"),
        db.CheckConstraint(
            "status IN ('suspected', 'reviewed', 'dismissed', 'overridden')",
            name="ck_error_flags_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id", ondelete="SET NULL"))
    error_tag_id = db.Column(
        db.Integer, db.ForeignKey("error_tags.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    evidence_count = db.Column(db.Integer, default=0, nullable=False)
    incorrect_count = db.Column(db.Integer, default=0, nullable=False)
    match_count = db.Column(db.Integer, default=0, nullable=False)
    evidence_json = db.Column(db.JSON, default=dict, nullable=False)
    status = db.Column(db.String(20), default="suspected", nullable=False)
    model_version = db.Column(db.String(50), default="heuristic-v1", nullable=False)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = db.Column(db.DateTime)

    student = db.relationship("User")
    topic = db.relationship("Topic")
    skill = db.relationship("Skill")
    error_tag = db.relationship("ErrorTag")
    reviews = db.relationship(
        "ErrorPatternReview",
        back_populates="flag",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class ErrorPatternReview(db.Model):
    __tablename__ = "error_pattern_reviews"
    __table_args__ = (
        db.CheckConstraint(
            "decision IN ('confirmed', 'dismissed', 'overridden')",
            name="ck_error_reviews_decision",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    error_pattern_flag_id = db.Column(
        db.Integer,
        db.ForeignKey("error_pattern_flags.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    decision = db.Column(db.String(20), nullable=False)
    replacement_error_tag_id = db.Column(db.Integer, db.ForeignKey("error_tags.id", ondelete="SET NULL"))
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    flag = db.relationship("ErrorPatternFlag", back_populates="reviews")
    reviewer = db.relationship("User", foreign_keys=[reviewer_id])


class Recommendation(db.Model):
    __tablename__ = "recommendations"
    __table_args__ = (
        db.CheckConstraint(
            "priority IN ('high', 'medium', 'low')", name="ck_recommendations_priority"
        ),
        db.CheckConstraint(
            "status IN ('generated', 'viewed', 'in_progress', 'completed', 'dismissed')",
            name="ck_recommendations_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id = db.Column(
        db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id", ondelete="SET NULL"))
    recommendation_type = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    evidence_json = db.Column(db.JSON, default=dict, nullable=False)
    priority = db.Column(db.String(20), default="medium", nullable=False)
    status = db.Column(db.String(20), default="generated", nullable=False)
    model_version = db.Column(db.String(50), default="heuristic-v1", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)

    student = db.relationship("User")
    topic = db.relationship("Topic")
    skill = db.relationship("Skill")
    actions = db.relationship(
        "RecommendationAction",
        back_populates="recommendation",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class RecommendationAction(db.Model):
    __tablename__ = "recommendation_actions"
    __table_args__ = (
        db.UniqueConstraint(
            "recommendation_id", "order_index", name="uq_recommendation_actions_order"
        ),
        db.CheckConstraint(
            "action_type IN ('resource', 'practice', 'reassessment', 'next_topic')",
            name="ck_recommendation_actions_type",
        ),
        db.CheckConstraint(
            "status IN ('pending', 'started', 'completed', 'skipped')",
            name="ck_recommendation_actions_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    recommendation_id = db.Column(
        db.Integer,
        db.ForeignKey("recommendations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_type = db.Column(db.String(30), nullable=False)
    resource_id = db.Column(db.Integer, db.ForeignKey("resources.id", ondelete="SET NULL"))
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="SET NULL"))
    target_topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="SET NULL"))
    title = db.Column(db.String(150), nullable=False)
    order_index = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False)
    completed_at = db.Column(db.DateTime)

    recommendation = db.relationship("Recommendation", back_populates="actions")
