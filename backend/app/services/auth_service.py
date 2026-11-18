import re
import uuid

from flask import has_app_context
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.user import Class, Enrollment, Role, TokenBlocklist, User


_REVOKED_TOKENS = set()


def revoke_token(jti):
    """Mark a JWT jti as revoked both in memory and persistent blocklist storage."""
    if not jti:
        return
    _REVOKED_TOKENS.add(jti)
    if has_app_context():
        try:
            existing = TokenBlocklist.query.filter_by(jti=jti).first()
            if not existing:
                db.session.add(TokenBlocklist(jti=jti))
                db.session.commit()
        except Exception:
            db.session.rollback()


def is_token_revoked(jti):
    """Check if a JWT jti has been revoked."""
    if not jti:
        return False
    if jti in _REVOKED_TOKENS:
        return True
    if has_app_context():
        try:
            return TokenBlocklist.query.filter_by(jti=jti).first() is not None
        except Exception:
            return False
    return False


def clear_revoked_tokens():
    """Clear revoked tokens (primarily used in testing)."""
    _REVOKED_TOKENS.clear()
    if has_app_context():
        try:
            TokenBlocklist.query.delete(synchronize_session=False)
            db.session.commit()
        except Exception:
            db.session.rollback()


class AuthService:
    @staticmethod
    def authenticate(email, password):
        """
        Authenticate a user by email and password.
        Returns a dict with user data and access_token, or raises a ValueError.
        """
        if not email or not isinstance(email, str) or not email.strip():
            raise ValueError("Email is required.")
        if not password or not isinstance(password, str):
            raise ValueError("Password is required.")

        normalized_email = email.strip().lower()
        user = User.query.filter_by(email=normalized_email).first()

        if user is None or not user.is_active:
            raise PermissionError("Invalid email or password.")

        if not check_password_hash(user.password_hash, password):
            raise PermissionError("Invalid email or password.")

        role_name = user.role.name if user.role else "student"

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                "public_id": user.public_id,
                "role": role_name,
                "name": user.name,
                "email": user.email,
            },
        )

        return {
            "user": {
                "id": user.id,
                "public_id": user.public_id,
                "name": user.name,
                "email": user.email,
                "role": role_name,
            },
            "access_token": access_token,
        }

    @staticmethod
    def get_profile(user_id):
        """
        Retrieve profile data and contextual associations for the authenticated user.
        """
        user = db.session.get(User, user_id)
        if user is None or not user.is_active:
            raise LookupError("User not found or account is inactive.")

        role_name = user.role.name if user.role else "student"

        profile = {
            "id": user.id,
            "public_id": user.public_id,
            "name": user.name,
            "email": user.email,
            "role": role_name,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

        if role_name == "student":
            profile["enrolled_classes"] = [
                {
                    "class_id": e.class_id,
                    "class_name": e.classroom.name if e.classroom else None,
                    "grade": e.classroom.grade if e.classroom else None,
                    "section": e.classroom.section if e.classroom else None,
                }
                for e in user.enrollments
                if e.status == "active"
            ]
        elif role_name == "teacher":
            profile["assigned_classes"] = [
                {
                    "class_id": a.class_id,
                    "class_name": a.classroom.name if a.classroom else None,
                    "subject_id": a.subject_id,
                    "subject_name": a.subject.name if a.subject else None,
                }
                for a in user.teacher_assignments
                if a.is_active
            ]
            profile["homeroom_classes"] = [
                {
                    "class_id": c.id,
                    "class_name": c.name,
                    "grade": c.grade,
                    "section": c.section,
                    "academic_year": c.academic_year,
                }
                for c in Class.query.filter_by(homeroom_teacher_id=user.id).all()
            ]

        return profile

    @staticmethod
    def register(name, email, password, role="student", grade="Class 9", class_id=None):
        """
        Register a new student or teacher account starting from a clean zero-progress state.
        Students are optionally enrolled in a requested or matching grade default class so they
        share common roadmaps, resources, and published assessments while keeping all progress
        strictly isolated at zero.
        """
        clean_name = (name or "").strip() if isinstance(name, str) else ""
        clean_email = (email or "").strip().lower() if isinstance(email, str) else ""
        clean_role = (role or "student").strip().lower() if isinstance(role, str) else "student"

        if not clean_name:
            raise ValueError("Full name is required.")
        if not clean_email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean_email):
            raise ValueError("A valid email address is required.")
        if not password or not isinstance(password, str) or len(password) < 4:
            raise ValueError("Password must be at least 4 characters.")

        if clean_role not in ("student", "teacher"):
            if clean_role == "admin":
                raise PermissionError("Admin accounts cannot be self-registered.")
            raise ValueError("Role must be either 'student' or 'teacher'.")

        if User.query.filter_by(email=clean_email).first():
            raise FileExistsError("An account with this email already exists.")

        role_obj = Role.query.filter_by(name=clean_role).first()
        if not role_obj:
            role_obj = Role(name=clean_role, description=f"{clean_role.title()} account role.")
            db.session.add(role_obj)
            db.session.flush()

        prefix = "STU" if clean_role == "student" else "TCH"
        public_id = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"
        while User.query.filter_by(public_id=public_id).first():
            public_id = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"

        user = User(
            public_id=public_id,
            name=clean_name,
            email=clean_email,
            password_hash=generate_password_hash(password),
            role_id=role_obj.id,
            is_active=True,
            data_source="user_registration",
        )
        db.session.add(user)
        db.session.flush()

        # Share access to common curriculum/assessments if registering as a student
        enrolled_class = None
        if clean_role == "student":
            target_class = None
            if class_id is not None:
                target_class = db.session.get(Class, class_id)
                if not target_class:
                    raise LookupError(f"Class with ID {class_id} not found.")
            else:
                raw_grade = (grade or "Class 9").strip()
                grade_candidates = [raw_grade]
                if raw_grade.lower().startswith("grade "):
                    grade_candidates.append(f"Class {raw_grade[6:].strip()}")
                elif raw_grade.isdigit():
                    grade_candidates.append(f"Class {raw_grade}")
                for candidate in grade_candidates:
                    target_class = (
                        Class.query.filter_by(grade=candidate)
                        .order_by(Class.id.asc())
                        .first()
                    )
                    if target_class:
                        break
                if not target_class:
                    target_class = Class.query.order_by(Class.id.asc()).first()

            if target_class:
                db.session.add(
                    Enrollment(
                        student_id=user.id,
                        class_id=target_class.id,
                        status="active",
                    )
                )
                enrolled_class = target_class.name

        db.session.commit()

        try:
            from app.services.audit_service import AuditService

            AuditService.log_event(
                action="auth.register",
                entity_type="User",
                entity_id=user.id,
                actor_id=user.id,
                metadata_json={"role": clean_role, "enrolled_class": enrolled_class},
                commit=True,
            )
        except Exception:
            pass

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                "public_id": user.public_id,
                "role": clean_role,
                "name": user.name,
                "email": user.email,
            },
        )

        return {
            "user": {
                "id": user.id,
                "public_id": user.public_id,
                "name": user.name,
                "email": user.email,
                "role": clean_role,
                "class_name": enrolled_class,
            },
            "access_token": access_token,
        }

    @staticmethod
    def logout(jti):
        """Revoke a token by its jti identifier."""
        revoke_token(jti)
        return True
