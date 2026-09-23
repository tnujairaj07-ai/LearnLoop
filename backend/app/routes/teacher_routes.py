from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app.services.analytics_service import AnalyticsService
from app.services.intervention_service import InterventionService
from app.utils.decorators import teacher_required
from app.utils.responses import error_response, success_response

teacher_bp = Blueprint("teacher", __name__, url_prefix="/api/teacher")


def _handle_exception(e):
    if isinstance(e, PermissionError):
        return error_response(str(e), status_code=403)
    if isinstance(e, ValueError):
        status_code = 404 if "not found" in str(e).lower() else 400
        return error_response(str(e), status_code=status_code)
    return error_response(str(e), status_code=500)


@teacher_bp.route("/classes", methods=["GET"])
@teacher_required
def get_classes():
    """Retrieve all classes and subjects assigned to the authenticated teacher."""
    teacher_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_teacher_classes(teacher_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/classes/<int:class_id>/dashboard", methods=["GET"])
@teacher_required
def get_class_dashboard(class_id):
    """Retrieve high-level overview metrics and participation for a specific class."""
    teacher_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_class_dashboard(teacher_id, class_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/classes/<int:class_id>/mastery-matrix", methods=["GET"])
@teacher_required
def get_class_mastery_matrix(class_id):
    """Retrieve topic-by-topic mastery heatmap and band distribution for the class."""
    teacher_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_class_mastery_matrix(teacher_id, class_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/classes/<int:class_id>/students", methods=["GET"])
@teacher_required
def get_class_students_diagnostic(class_id):
    """Retrieve student roster diagnostic profiles with constructive support categories."""
    teacher_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_class_students_diagnostic(teacher_id, class_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/classes/<int:class_id>/assessments/<int:assessment_id>/item-analysis", methods=["GET"])
@teacher_required
def get_assessment_item_analysis(class_id, assessment_id):
    """Retrieve question-by-question accuracy and distractor distributions."""
    teacher_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_assessment_item_analysis(teacher_id, class_id, assessment_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/classes/<int:class_id>/error-patterns", methods=["GET"])
@teacher_required
def get_class_error_patterns(class_id):
    """Retrieve class-aggregated recurrent misconception flags with affected students."""
    teacher_id = int(get_jwt_identity())
    try:
        data = AnalyticsService.get_class_error_patterns(teacher_id, class_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/error-patterns/<int:flag_id>/review", methods=["POST"])
@teacher_required
def review_error_pattern(flag_id):
    """Teacher confirms, dismisses, or overrides a student's suspected error pattern flag."""
    teacher_id = int(get_jwt_identity())
    payload = request.get_json() or {}
    decision = payload.get("decision")
    comments = payload.get("comments")

    if not decision:
        return error_response("Missing required field: decision", status_code=400)

    try:
        result = InterventionService.review_error_pattern(
            teacher_id=teacher_id, flag_id=flag_id, decision=decision, comments=comments
        )
        return success_response(data=result, message=f"Error pattern flag {flag_id} reviewed successfully.")
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions", methods=["GET"])
@teacher_required
def list_interventions():
    """List interventions assigned to or created by the teacher."""
    teacher_id = int(get_jwt_identity())
    class_id = request.args.get("class_id", type=int)
    status = request.args.get("status")
    topic_id = request.args.get("topic_id", type=int)

    try:
        data = InterventionService.list_interventions(
            teacher_id=teacher_id, class_id=class_id, status=status, topic_id=topic_id
        )
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions/generate", methods=["POST"])
@teacher_required
def generate_interventions():
    """Automatically scans class analytics to propose evidence-backed intervention suggestions."""
    teacher_id = int(get_jwt_identity())
    payload = request.get_json() or {}
    class_id = payload.get("class_id")

    if not class_id:
        return error_response("Missing required field: class_id", status_code=400)

    try:
        generated = InterventionService.generate_suggested_interventions(teacher_id, class_id)
        data = InterventionService.list_interventions(teacher_id, class_id=class_id)
        return success_response(data=data, message=f"Generated {len(generated)} intervention suggestions.")
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions", methods=["POST"])
@teacher_required
def create_intervention():
    """Manually creates a new intervention proposal."""
    teacher_id = int(get_jwt_identity())
    payload = request.get_json() or {}

    try:
        data = InterventionService.create_intervention(teacher_id, payload)
        return success_response(data=data, message="Intervention created successfully.", status_code=201)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions/<int:intervention_id>", methods=["GET"])
@teacher_required
def get_intervention(intervention_id):
    """Retrieve full details of an intervention including assigned student roster."""
    teacher_id = int(get_jwt_identity())
    try:
        data = InterventionService.get_intervention_details(teacher_id, intervention_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions/<int:intervention_id>", methods=["PATCH"])
@teacher_required
def update_intervention(intervention_id):
    """Update editable details or status of an intervention."""
    teacher_id = int(get_jwt_identity())
    payload = request.get_json() or {}

    try:
        data = InterventionService.update_intervention(teacher_id, intervention_id, payload)
        return success_response(data=data, message="Intervention updated successfully.")
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions/<int:intervention_id>/assign", methods=["POST"])
@teacher_required
def assign_intervention(intervention_id):
    """Assigns an intervention to class students and records baseline before_mastery."""
    teacher_id = int(get_jwt_identity())
    payload = request.get_json() or {}
    student_ids = payload.get("student_ids")

    try:
        data = InterventionService.assign_intervention(teacher_id, intervention_id, student_ids)
        return success_response(data=data, message="Intervention assigned successfully.")
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions/<int:intervention_id>/complete", methods=["POST"])
@teacher_required
def complete_intervention(intervention_id):
    """Marks intervention complete, evaluates post-mastery and reassessments, and computes learning gains."""
    teacher_id = int(get_jwt_identity())
    payload = request.get_json() or {}
    reassessment_id = payload.get("reassessment_id")

    try:
        data = InterventionService.complete_intervention(teacher_id, intervention_id, reassessment_id)
        return success_response(data=data, message="Intervention completed and learning gains calculated.")
    except Exception as e:
        return _handle_exception(e)


@teacher_bp.route("/interventions/<int:intervention_id>/outcomes", methods=["GET"])
@teacher_required
def get_intervention_outcomes(intervention_id):
    """Retrieve outcome summary comparing pre/post performance, learning gains, and student outcomes."""
    teacher_id = int(get_jwt_identity())
    try:
        data = InterventionService.get_intervention_outcomes(teacher_id, intervention_id)
        return success_response(data=data)
    except Exception as e:
        return _handle_exception(e)
