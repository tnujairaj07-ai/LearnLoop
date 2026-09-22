from app.utils.responses import error_response


def register_jwt_callbacks(jwt, is_token_revoked_fn):
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload.get("jti")
        return is_token_revoked_fn(jti)

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response(
            message="Token has expired",
            errors=[
                {
                    "code": "TOKEN_EXPIRED",
                    "message": "The authorization token has expired. Please log in again.",
                }
            ],
            status_code=401,
        )

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return error_response(
            message="Invalid token",
            errors=[
                {
                    "code": "INVALID_TOKEN",
                    "message": error_string,
                }
            ],
            status_code=401,
        )

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return error_response(
            message="Authorization token is missing",
            errors=[
                {
                    "code": "AUTHORIZATION_REQUIRED",
                    "message": "A valid authorization token is required to access this resource.",
                }
            ],
            status_code=401,
        )

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return error_response(
            message="Token has been revoked",
            errors=[
                {
                    "code": "TOKEN_REVOKED",
                    "message": "This token has been revoked. Please log in again.",
                }
            ],
            status_code=401,
        )
