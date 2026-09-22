from datetime import datetime

from app.extensions import db


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    users = db.relationship("User", back_populates="role", lazy=True)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(
        db.Integer, db.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
    )
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    data_source = db.Column(db.String(32), default="manual", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    role = db.relationship("Role", back_populates="users")
    enrollments = db.relationship(
        "Enrollment",
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    attempts = db.relationship(
        "Attempt",
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    mastery_records = db.relationship(
        "MasteryRecord",
        back_populates="student",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    teacher_assignments = db.relationship(
        "TeacherAssignment",
        back_populates="teacher",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class Class(db.Model):
    __tablename__ = "classes"
    __table_args__ = (
        db.UniqueConstraint("name", "academic_year", name="uq_classes_name_year"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    grade = db.Column(db.String(20), nullable=False)
    section = db.Column(db.String(10), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    data_source = db.Column(db.String(32), default="manual", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    enrollments = db.relationship(
        "Enrollment",
        back_populates="classroom",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )
    teacher_assignments = db.relationship(
        "TeacherAssignment",
        back_populates="classroom",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy=True,
    )


class Enrollment(db.Model):
    __tablename__ = "enrollments"
    __table_args__ = (
        db.UniqueConstraint("student_id", "class_id", name="uq_enrollments_student_class"),
        db.CheckConstraint(
            "status IN ('active', 'inactive', 'withdrawn')",
            name="ck_enrollments_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(20), default="active", nullable=False)

    student = db.relationship("User", back_populates="enrollments")
    classroom = db.relationship("Class", back_populates="enrollments")


class TeacherAssignment(db.Model):
    __tablename__ = "teacher_assignments"
    __table_args__ = (
        db.UniqueConstraint(
            "teacher_id", "class_id", "subject_id", name="uq_teacher_class_subject"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    teacher = db.relationship("User", back_populates="teacher_assignments")
    classroom = db.relationship("Class", back_populates="teacher_assignments")
    subject = db.relationship("Subject", back_populates="teacher_assignments")
