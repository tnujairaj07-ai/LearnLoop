from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash

from app.extensions import db
from app.models.user import User


_REVOKED_TOKENS = set()


def revoke_token(jti):
    """Mark a JWT jti as revoked."""
    if jti:
        _REVOKED_TOKENS.add(jti)


def is_token_revoked(jti):
    """Check if a JWT jti has been revoked."""
    return jti in _REVOKED_TOKENS


def clear_revoked_tokens():
    """Clear revoked tokens (primarily used in testing)."""
    _REVOKED_TOKENS.clear()


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

        return profile

    @staticmethod
    def logout(jti):
        """Revoke a token by its jti identifier."""
        revoke_token(jti)
        return True
