from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.services.analytics_service import AnalyticsService
from app.services.recommendation_service import RecommendationService
from app.utils.decorators import student_required
from app.utils.responses import error_response, success_response

student_bp = Blueprint("student", __name__, url_prefix="/api/student")


@student_bp.route("/dashboard", methods=["GET"])
@student_required
def get_dashboard():
    """Retrieve high-level student dashboard summary."""
    student_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_student_dashboard(student_id)
        return success_response(data=data)
    except Exception as e:
        return error_response(str(e), status_code=500)


@student_bp.route("/mastery", methods=["GET"])
@student_required
def get_mastery():
    """Retrieve detailed topic-by-topic mastery breakdowns and explainable evidence."""
    student_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_student_mastery(student_id)
        return success_response(data=data)
    except Exception as e:
        return error_response(str(e), status_code=500)


@student_bp.route("/growth", methods=["GET"])
@student_required
def get_growth():
    """Retrieve chronological learning trajectory across past attempts."""
    student_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_student_growth(student_id)
        return success_response(data=data)
    except Exception as e:
        return error_response(str(e), status_code=500)


@student_bp.route("/recommendations", methods=["GET"])
@student_required
def get_recommendations():
    """Retrieve active next-step recommendations and structured action items."""
    student_id = int(get_jwt_identity())
    topic_id = request.args.get("topic_id", type=int)
    status = request.args.get("status")

    recs = RecommendationService.get_student_recommendations(
        student_id=student_id, topic_id=topic_id, status=status
    )
    return success_response(data={"recommendations": recs})


@student_bp.route("/recommendations/<int:rec_id>/status", methods=["PATCH"])
@student_required
def update_recommendation_status(rec_id):
    """Update recommendation progress state (viewed, in_progress, completed, dismissed)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "status" not in data:
        return error_response("Request body must include 'status'.", status_code=400)

    student_id = int(get_jwt_identity())
    try:
        rec = RecommendationService.update_recommendation_status(
            rec_id=rec_id, status=data["status"], student_id=student_id
        )
        return success_response(data={"recommendation": rec}, message="Recommendation status updated.")
    except LookupError as e:
        return error_response(str(e), status_code=404)
    except PermissionError as e:
        return error_response(str(e), status_code=403)
    except ValueError as e:
        return error_response(str(e), status_code=400)


@student_bp.route("/actions/<int:action_id>/complete", methods=["POST"])
@student_required
def complete_action(action_id):
    """Mark a recommended action item as completed by the student."""
    student_id = int(get_jwt_identity())
    try:
        result = RecommendationService.complete_action(action_id=action_id, student_id=student_id)
        return success_response(data=result, message="Action item marked as completed.")
    except LookupError as e:
        return error_response(str(e), status_code=404)
    except PermissionError as e:
        return error_response(str(e), status_code=403)
