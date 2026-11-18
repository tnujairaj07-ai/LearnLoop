from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.services.analytics_service import AnalyticsService
from app.services.recommendation_service import RecommendationService
from app.services.student_portal_service import StudentPortalService
from app.utils.decorators import student_required
from app.utils.responses import error_response, success_response

student_bp = Blueprint("student", __name__, url_prefix="/api/student")


@student_bp.route("/dashboard", methods=["GET"])
@student_required
def get_dashboard():
    """Retrieve high-level student dashboard summary enriched with live tasks, events, and chart histories."""
    student_id = int(get_jwt_identity())
    try:
        data = StudentPortalService.get_student_dashboard_enriched(student_id)
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


@student_bp.route("/reports/<string:term_label>", methods=["GET"])
@student_required
def get_student_term_report(term_label):
    """Retrieve personal Traditional & Analytics Report Card for a given term."""
    student_id = int(get_jwt_identity())
    subject_id = request.args.get("subject_id", type=int)
    try:
        from app.services.report_service import ReportService
        report = ReportService.get_student_report(
            actor_id=student_id,
            actor_role="student",
            student_id=student_id,
            term_label=term_label,
            subject_id=subject_id,
        )
        return success_response(data=report)
    except Exception as e:
        return error_response(str(e), status_code=500)


@student_bp.route("/roadmap", methods=["GET"])
@student_required
def get_roadmap():
    """Retrieve shared subject catalog annotated with personal mastery and bookmark state."""
    student_id = int(get_jwt_identity())
    category = request.args.get("category")
    search = request.args.get("search")
    bookmarked_only = request.args.get("bookmarked", "").lower() in ("true", "1")
    data = StudentPortalService.get_roadmap(
        student_id=student_id,
        category=category,
        search=search,
        bookmarked_only=bookmarked_only,
    )
    return success_response(data=data)


@student_bp.route("/subjects/<int:subject_id>/bookmark", methods=["POST"])
@student_required
def toggle_subject_bookmark(subject_id):
    """Toggle a subject bookmark for the authenticated student."""
    student_id = int(get_jwt_identity())
    try:
        data = StudentPortalService.toggle_subject_bookmark(student_id, subject_id)
        return success_response(data=data, message="Bookmark updated.")
    except LookupError as e:
        return error_response(str(e), status_code=404)


@student_bp.route("/subjects/<int:subject_id>/chapters", methods=["GET"])
@student_required
def get_subject_chapters(subject_id):
    """Retrieve ordered subject chapters with per-student mastery, resources, and quiz IDs."""
    student_id = int(get_jwt_identity())
    try:
        data = StudentPortalService.get_subject_chapters(student_id, subject_id)
        return success_response(data=data)
    except LookupError as e:
        return error_response(str(e), status_code=404)


@student_bp.route("/topics/<int:topic_id>", methods=["GET"])
@student_required
def get_topic_detail(topic_id):
    """Retrieve topic detail view with personal mastery components, resources, and error patterns."""
    student_id = int(get_jwt_identity())
    try:
        data = StudentPortalService.get_topic_student_detail(student_id, topic_id)
        return success_response(data=data)
    except LookupError as e:
        return error_response(str(e), status_code=404)


@student_bp.route("/resources/<int:resource_id>/review", methods=["POST"])
@student_required
def review_resource(resource_id):
    """Record that the student reviewed a resource and update study engagement."""
    student_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}
    duration_seconds = payload.get("duration_seconds", 300)
    try:
        data = StudentPortalService.mark_resource_reviewed(
            student_id=student_id, resource_id=resource_id, duration_seconds=duration_seconds
        )
        return success_response(data=data, message="Resource marked as reviewed.")
    except LookupError as e:
        return error_response(str(e), status_code=404)
    except ValueError as e:
        return error_response(str(e), status_code=400)


@student_bp.route("/tasks", methods=["POST"])
@student_required
def create_task():
    """Create a personal checklist task on the student dashboard."""
    student_id = int(get_jwt_identity())
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)
    try:
        task = StudentPortalService.create_student_task(student_id, payload)
        return success_response(data={"task": task}, message="Task created.", status_code=201)
    except ValueError as e:
        return error_response(str(e), status_code=400)


@student_bp.route("/tasks/<int:task_id>", methods=["PATCH"])
@student_required
def toggle_task(task_id):
    """Toggle or set completion status on a student's own dashboard task."""
    student_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}
    is_done = payload.get("is_done") if isinstance(payload, dict) and "is_done" in payload else None
    try:
        task = StudentPortalService.toggle_student_task(student_id, task_id, is_done=is_done)
        return success_response(data={"task": task}, message="Task updated.")
    except LookupError as e:
        return error_response(str(e), status_code=404)
    except PermissionError as e:
        return error_response(str(e), status_code=403)


@student_bp.route("/reminders/<int:reminder_id>/read", methods=["POST"])
@student_required
def read_reminder(reminder_id):
    """Mark a teacher reminder addressed to the student as read."""
    student_id = int(get_jwt_identity())
    try:
        data = StudentPortalService.mark_reminder_read(student_id, reminder_id)
        return success_response(data=data, message="Reminder marked as read.")
    except LookupError as e:
        return error_response(str(e), status_code=404)
    except PermissionError as e:
        return error_response(str(e), status_code=403)


@student_bp.route("/practice-hub", methods=["GET"])
@student_required
def get_practice_hub():
    """Retrieve subjects and chapter-wise assignments, quizzes, and tests with personal progress."""
    student_id = int(get_jwt_identity())
    subject_id = request.args.get("subject_id", type=int)
    try:
        data = StudentPortalService.get_practice_hub(student_id=student_id, subject_id=subject_id)
        return success_response(data=data)
    except LookupError as e:
        return error_response(str(e), status_code=404)


@student_bp.route("/analysis", methods=["GET"])
@student_required
def get_analysis():
    """Retrieve 4-part explainable mastery, competency radar, error patterns, and 365-day activity heatmap."""
    student_id = int(get_jwt_identity())
    days = min(365, max(7, request.args.get("days", default=365, type=int)))
    data = StudentPortalService.get_student_analysis(student_id=student_id, days=days)
    return success_response(data=data)


@student_bp.route("/weekly-progress", methods=["GET"])
@student_required
def get_weekly_progress():
    """Retrieve 8-week study sessions, channel split, schedule matrix, and cohort rank."""
    student_id = int(get_jwt_identity())
    week_offset = request.args.get("week_offset", default=0, type=int)
    week_key = request.args.get("week")
    data = StudentPortalService.get_weekly_progress(
        student_id=student_id, week_offset=week_offset, week_key=week_key
    )
    return success_response(data=data)


@student_bp.route("/study-sessions", methods=["POST"])
@student_required
def log_study_session():
    """Log an explicit study session and update daily heatmap rollups."""
    student_id = int(get_jwt_identity())
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)
    try:
        session = StudentPortalService.create_study_session(student_id, payload)
        return success_response(data={"session": session}, message="Study session recorded.", status_code=201)
    except (ValueError, TypeError) as e:
        return error_response(str(e), status_code=400)


@student_bp.route("/report-card", methods=["GET"])
@student_required
def get_report_card_bundle():
    """Retrieve multi-term reports, attendance, cohort rank, teacher feedback, and achievements."""
    student_id = int(get_jwt_identity())
    try:
        data = StudentPortalService.get_student_report_card_bundle(student_id)
        return success_response(data=data)
    except LookupError as e:
        return error_response(str(e), status_code=404)

