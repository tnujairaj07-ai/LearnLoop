from functools import wraps

from flask_jwt_extended import get_jwt, verify_jwt_in_request

from app.utils.responses import error_response


def roles_required(*roles):
    """
    Decorator to restrict access to users holding one of the specified roles.
    Verifies JWT presence, extracts the role claim, and returns 403 FORBIDDEN if unauthorized.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in roles:
                return error_response(
                    message="You do not have permission to access this resource.",
                    errors=[
                        {
                            "code": "FORBIDDEN",
                            "message": f"Action requires role(s): {', '.join(roles)}. Your current role is: {user_role}.",
                        }
                    ],
                    status_code=403,
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    """Restricts access to administrators only."""
    return roles_required("admin")(fn)


def teacher_required(fn):
    """Restricts access to teachers and administrators."""
    return roles_required("teacher", "admin")(fn)


def student_required(fn):
    """Restricts access to students only."""
    return roles_required("student")(fn)
