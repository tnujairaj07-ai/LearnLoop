from datetime import datetime

from app.extensions import db


class StudySession(db.Model):
    """Logs individual learning, practice, or resource study sessions with time-slot and platform metadata."""

    __tablename__ = "study_sessions"
    __table_args__ = (
        db.CheckConstraint(
            "activity_type IN ('quiz', 'practice', 'assignment', 'resource', 'video')",
            name="ck_study_sessions_activity_type",
        ),
        db.CheckConstraint(
            "platform IN ('web', 'mobile')", name="ck_study_sessions_platform"
        ),
        db.CheckConstraint(
            "time_slot IN ('morning', 'afternoon', 'evening')",
            name="ck_study_sessions_time_slot",
        ),
        db.CheckConstraint("duration_minutes >= 0", name="ck_study_sessions_duration"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="SET NULL"), index=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="SET NULL"), index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="SET NULL"))
    activity_type = db.Column(db.String(30), default="practice", nullable=False)
    title = db.Column(db.String(200), nullable=False)
    duration_minutes = db.Column(db.Integer, default=0, nullable=False)
    score_percentage = db.Column(db.Float)
    platform = db.Column(db.String(20), default="web", nullable=False)
    time_slot = db.Column(db.String(20), default="evening", nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    ended_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User")
    topic = db.relationship("Topic")
    subject = db.relationship("Subject")


class StudentDailyActivity(db.Model):
    """Per-student daily activity rollup powering activity heatmaps, streaks, and weekly summaries."""

    __tablename__ = "student_daily_activity"
    __table_args__ = (
        db.UniqueConstraint("student_id", "activity_date", name="uq_daily_activity_student_date"),
        db.CheckConstraint("questions_answered >= 0", name="ck_daily_activity_questions"),
        db.CheckConstraint("correct_count >= 0", name="ck_daily_activity_correct"),
        db.CheckConstraint("tasks_completed >= 0", name="ck_daily_activity_tasks"),
        db.CheckConstraint("active_minutes >= 0", name="ck_daily_activity_minutes"),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_date = db.Column(db.Date, nullable=False, index=True)
    questions_answered = db.Column(db.Integer, default=0, nullable=False)
    correct_count = db.Column(db.Integer, default=0, nullable=False)
    tasks_completed = db.Column(db.Integer, default=0, nullable=False)
    active_minutes = db.Column(db.Integer, default=0, nullable=False)
    primary_topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    student = db.relationship("User")
    primary_topic = db.relationship("Topic")


class StudentTask(db.Model):
    """Stores student dashboard checklist tasks and completion state."""

    __tablename__ = "student_tasks"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = db.Column(db.String(200), nullable=False)
    is_done = db.Column(db.Boolean, default=False, nullable=False)
    recommendation_action_id = db.Column(
        db.Integer, db.ForeignKey("recommendation_actions.id", ondelete="SET NULL")
    )
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)


class AttendanceRecord(db.Model):
    """Stores daily/session student attendance records for class analytics and report cards."""

    __tablename__ = "attendance_records"
    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "class_id", "attendance_date", name="uq_attendance_student_class_date"
        ),
        db.CheckConstraint(
            "status IN ('present', 'absent', 'late', 'excused')",
            name="ck_attendance_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attendance_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(20), default="present", nullable=False)
    recorded_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ClassEvent(db.Model):
    """Scheduled lessons, clinics, workshops, and reassessment windows for a class."""

    __tablename__ = "class_events"
    __table_args__ = (
        db.CheckConstraint(
            "event_type IN ('lesson', 'clinic', 'workshop', 'reassessment', 'exam')",
            name="ck_class_events_type",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="SET NULL"))
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    title = db.Column(db.String(200), nullable=False)
    event_type = db.Column(db.String(30), default="lesson", nullable=False)
    topic_label = db.Column(db.String(120))
    scheduled_at = db.Column(db.DateTime, nullable=False, index=True)
    time_label = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    teacher = db.relationship("User")


class ClassAnnouncement(db.Model):
    """Homeroom or subject class announcements authored by teachers."""

    __tablename__ = "class_announcements"

    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    message = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class TeacherFeedback(db.Model):
    """Pedagogical comments and qualitative notes authored by teachers for individual students."""

    __tablename__ = "teacher_feedback"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), index=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="SET NULL"))
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="SET NULL"))
    comment_text = db.Column(db.Text, nullable=False)
    tags_json = db.Column(db.JSON, default=list, nullable=False)
    is_visible_to_student = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    student = db.relationship("User", foreign_keys=[student_id])
    teacher = db.relationship("User", foreign_keys=[teacher_id])
    subject = db.relationship("Subject")


class Achievement(db.Model):
    """Catalog of learning milestones and merit badges that students can earn."""

    __tablename__ = "achievements"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default="mastery", nullable=False)
    badge_label = db.Column(db.String(80), nullable=False)
    color_theme = db.Column(db.String(50), default="bg-blue-500 text-white", nullable=False)
    icon_type = db.Column(db.String(30), default="award", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class StudentAchievement(db.Model):
    """Links individual students to earned achievements and award timestamps."""

    __tablename__ = "student_achievements"
    __table_args__ = (
        db.UniqueConstraint("student_id", "achievement_id", name="uq_student_achievements_pair"),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    achievement_id = db.Column(
        db.Integer, db.ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False, index=True
    )
    awarded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    metadata_json = db.Column(db.JSON, default=dict, nullable=False)

    achievement = db.relationship("Achievement")


class StudentReminder(db.Model):
    """Teacher-sent nudges and activity reminders delivered to students."""

    __tablename__ = "student_reminders"
    __table_args__ = (
        db.CheckConstraint(
            "reminder_type IN ('nudge', 'reassessment', 'intervention', 'announcement')",
            name="ck_student_reminders_type",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    recipient_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id", ondelete="SET NULL"))
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    reminder_type = db.Column(db.String(30), default="nudge", nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
