from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services.assessment_service import AssessmentService
from app.utils.decorators import student_required, teacher_required
from app.utils.responses import error_response, success_response

assessment_bp = Blueprint("assessment", __name__, url_prefix="/api")


# -------------------------------------------------------------
# Assessment Management (Teachers, Admins, and Enrolled Students)
# -------------------------------------------------------------
@assessment_bp.route("/assessments", methods=["GET"])
@jwt_required()
def list_assessments():
    """List assessments available to the caller's role and class enrollment."""
    claims = get_jwt()
    user_role = claims.get("role", "student")
    user_id = int(get_jwt_identity())

    class_id = request.args.get("class_id", type=int)
    assessment_type = request.args.get("assessment_type")
    status = request.args.get("status")

    assessments = AssessmentService.get_assessments(
        class_id=class_id,
        assessment_type=assessment_type,
        status=status,
        user_role=user_role,
        user_id=user_id,
    )
    return success_response(data={"assessments": assessments})


@assessment_bp.route("/assessments/<int:assessment_id>", methods=["GET"])
@jwt_required()
def get_assessment(assessment_id):
    """Retrieve assessment details and ordered questions (student-safe for students)."""
    claims = get_jwt()
    user_role = claims.get("role", "student")
    user_id = int(get_jwt_identity())

    try:
        assessment = AssessmentService.get_assessment_by_id(
            assessment_id=assessment_id, user_role=user_role, user_id=user_id
        )
        return success_response(data={"assessment": assessment})
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)


@assessment_bp.route("/assessments", methods=["POST"])
@teacher_required
def create_assessment():
    """Create a new assessment with assigned questions (teacher or admin)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    user_id = int(get_jwt_identity())
    try:
        assessment = AssessmentService.create_assessment(data, user_id=user_id)
        return success_response(
            data={"assessment": assessment},
            message="Assessment created successfully.",
            status_code=201,
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@assessment_bp.route("/assessments/<int:assessment_id>/status", methods=["PATCH"])
@teacher_required
def update_assessment_status(assessment_id):
    """Publish or close an assessment."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "status" not in data:
        return error_response("Request body must include 'status'.", status_code=400)

    try:
        result = AssessmentService.update_assessment_status(assessment_id, data["status"])
        return success_response(data=result, message=f"Assessment status updated to {result['status']}.")
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


# -------------------------------------------------------------
# Student Attempt Lifecycle & Scoring
# -------------------------------------------------------------
@assessment_bp.route("/assessments/<int:assessment_id>/start", methods=["POST"])
@student_required
def start_attempt(assessment_id):
    """Start or resume an assessment attempt for the authenticated student."""
    student_id = int(get_jwt_identity())
    try:
        attempt_session = AssessmentService.start_attempt(assessment_id, student_id)
        return success_response(
            data={"attempt": attempt_session},
            message="Assessment attempt started.",
            status_code=200,
        )
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@assessment_bp.route("/attempts/<int:attempt_id>/answers", methods=["POST"])
@student_required
def save_answer(attempt_id):
    """Autosave/upsert a single question response during an in-progress attempt."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    question_id = data.get("question_id")
    answer_text = data.get("answer_text")
    time_spent_seconds = data.get("time_spent_seconds", 0)

    if not question_id:
        return error_response("question_id is required in request body.", status_code=400)

    student_id = int(get_jwt_identity())
    try:
        result = AssessmentService.save_answer(
            attempt_id=attempt_id,
            question_id=question_id,
            answer_text=answer_text,
            time_spent_seconds=time_spent_seconds,
            student_id=student_id,
        )
        return success_response(data=result, message="Answer saved successfully.")
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@assessment_bp.route("/attempts/<int:attempt_id>/submit", methods=["POST"])
@student_required
def submit_attempt(attempt_id):
    """Finalize, score, and lock an assessment attempt."""
    student_id = int(get_jwt_identity())
    try:
        result = AssessmentService.submit_attempt(attempt_id, student_id)
        return success_response(
            data={"result": result},
            message="Assessment submitted and scored successfully.",
            status_code=200,
        )
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@assessment_bp.route("/attempts/<int:attempt_id>/result", methods=["GET"])
@jwt_required()
def get_attempt_result(attempt_id):
    """Retrieve post-submission scored breakdown and explanation."""
    claims = get_jwt()
    user_role = claims.get("role", "student")
    user_id = int(get_jwt_identity())

    try:
        result = AssessmentService.get_attempt_result(
            attempt_id=attempt_id, user_role=user_role, user_id=user_id
        )
        return success_response(data={"result": result})
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)
