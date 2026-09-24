from flask import current_app
from werkzeug.exceptions import HTTPException

from app.utils.responses import error_response


class ForbiddenError(PermissionError):
    pass


class NotFoundError(LookupError):
    pass


class ValidationError(ValueError):
    pass


def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return error_response(
            message=error.description,
            status_code=error.code or 500,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error):
        current_app.logger.exception("Unhandled server error: %s", error)

        if current_app.config.get("DEBUG"):
            return error_response(
                message=str(error),
                status_code=500,
            )

        return error_response(
            message="An unexpected server error occurred.",
            status_code=500,
        )