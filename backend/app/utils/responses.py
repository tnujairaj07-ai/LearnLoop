from flask import jsonify


def success_response(data=None, message=None, status_code=200):
    return (
        jsonify(
            {
                "success": True,
                "data": data if data is not None else {},
                "message": message,
                "errors": [],
            }
        ),
        status_code,
    )


def error_response(message, errors=None, status_code=400):
    return (
        jsonify(
            {
                "success": False,
                "data": None,
                "message": message,
                "errors": errors if errors is not None else [],
            }
        ),
        status_code,
    )