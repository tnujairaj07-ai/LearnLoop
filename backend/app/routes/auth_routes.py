from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services.auth_service import AuthService
from app.utils.responses import error_response, success_response


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user with email and password, returning user data and JWT access token."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response(
            message="Request body must be a valid JSON object.",
            errors=[{"code": "VALIDATION_ERROR", "field": "body", "message": "Expected JSON object"}],
            status_code=400,
        )

    email = data.get("email")
    password = data.get("password")

    if not email or not isinstance(email, str) or not email.strip():
        return error_response(
            message="Email is required.",
            errors=[{"code": "VALIDATION_ERROR", "field": "email", "message": "Email cannot be blank"}],
            status_code=400,
        )

    if not password or not isinstance(password, str):
        return error_response(
            message="Password is required.",
            errors=[{"code": "VALIDATION_ERROR", "field": "password", "message": "Password cannot be blank"}],
            status_code=400,
        )

    try:
        auth_data = AuthService.authenticate(email, password)
        return success_response(
            data=auth_data,
            message="Authentication successful.",
            status_code=200,
        )
    except PermissionError as e:
        return error_response(
            message=str(e),
            errors=[{"code": "INVALID_CREDENTIALS", "message": str(e)}],
            status_code=401,
        )
    except ValueError as e:
        return error_response(
            message=str(e),
            errors=[{"code": "VALIDATION_ERROR", "message": str(e)}],
            status_code=400,
        )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Retrieve profile and role information for the currently authenticated user."""
    try:
        user_id = int(get_jwt_identity())
        profile = AuthService.get_profile(user_id)
        return success_response(
            data=profile,
            message="User profile retrieved.",
            status_code=200,
        )
    except LookupError as e:
        return error_response(
            message=str(e),
            errors=[{"code": "USER_NOT_FOUND", "message": str(e)}],
            status_code=404,
        )
    except (TypeError, ValueError):
        return error_response(
            message="Invalid identity in authorization token.",
            errors=[{"code": "INVALID_TOKEN_IDENTITY", "message": "The token identity could not be parsed."}],
            status_code=401,
        )


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revoke the current access token."""
    claims = get_jwt()
    jti = claims.get("jti")
    AuthService.logout(jti)
    return success_response(
        data={"revoked": True},
        message="Successfully logged out.",
        status_code=200,
    )
