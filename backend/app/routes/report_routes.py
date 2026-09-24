"""
Report Routes

Provides protected REST endpoints for generating and retrieving Traditional and
Analytics Report Cards for students and classes.
"""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services.report_service import ReportService
from app.utils.errors import ForbiddenError, NotFoundError, ValidationError
from app.utils.responses import error_response, success_response

report_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def _handle_exception(e):
    if isinstance(e, (PermissionError, ForbiddenError)):
        return error_response(str(e), status_code=403)
    if isinstance(e, (LookupError, NotFoundError)):
        return error_response(str(e), status_code=404)
    if isinstance(e, (ValueError, ValidationError)):
        status_code = 404 if "not found" in str(e).lower() else 400
        return error_response(str(e), status_code=status_code)
    return error_response(str(e), status_code=500)


@report_bp.route("/student/<int:student_id>/generate", methods=["POST"])
@jwt_required()
def generate_student_report(student_id):
    """
    Generate or regenerate a student's Traditional & Analytics Report Card.
    Allowed for assigned teachers and administrators (or the student themselves).
    """
    actor_id = int(get_jwt_identity())
    claims = get_jwt()
    actor_role = claims.get("role")

    data = request.get_json() or {}
    subject_id = data.get("subject_id")
    term_label = data.get("term_label", "Term 1")
    report_type = data.get("report_type", "student")

    if not subject_id:
        return error_response("subject_id is required.", status_code=400)

    try:
        report = ReportService.generate_student_report(
            actor_id=actor_id,
            actor_role=actor_role,
            student_id=student_id,
            subject_id=int(subject_id),
            term_label=term_label,
            report_type=report_type,
        )
        return success_response(data=report, message="Student report generated successfully.", status_code=201)
    except Exception as e:
        return _handle_exception(e)


@report_bp.route("/student/<int:student_id>/<string:term_label>", methods=["GET"])
@jwt_required()
def get_student_report(student_id, term_label):
    """
    Retrieve a student's report card for a specific term.
    Students may only retrieve their own report. Teachers must be assigned to the student's class.
    """
    actor_id = int(get_jwt_identity())
    claims = get_jwt()
    actor_role = claims.get("role")

    subject_id = request.args.get("subject_id", type=int)

    try:
        report = ReportService.get_student_report(
            actor_id=actor_id,
            actor_role=actor_role,
            student_id=student_id,
            term_label=term_label,
            subject_id=subject_id,
        )
        return success_response(data=report)
    except Exception as e:
        return _handle_exception(e)


@report_bp.route("/class/<int:class_id>/generate", methods=["POST"])
@jwt_required()
def generate_class_report(class_id):
    """
    Generate an aggregate Class Report card.
    Allowed for assigned teachers and administrators.
    """
    actor_id = int(get_jwt_identity())
    claims = get_jwt()
    actor_role = claims.get("role")

    data = request.get_json() or {}
    subject_id = data.get("subject_id")
    term_label = data.get("term_label", "Term 1")
    report_type = data.get("report_type", "class")

    if not subject_id:
        return error_response("subject_id is required.", status_code=400)

    try:
        report = ReportService.generate_class_report(
            actor_id=actor_id,
            actor_role=actor_role,
            class_id=class_id,
            subject_id=int(subject_id),
            term_label=term_label,
            report_type=report_type,
        )
        return success_response(data=report, message="Class report generated successfully.", status_code=201)
    except Exception as e:
        return _handle_exception(e)


@report_bp.route("/class/<int:class_id>/<int:subject_id>/<string:term_label>", methods=["GET"])
@jwt_required()
def get_class_report(class_id, subject_id, term_label):
    """
    Retrieve an aggregate Class Report card.
    Allowed for assigned teachers and administrators.
    """
    actor_id = int(get_jwt_identity())
    claims = get_jwt()
    actor_role = claims.get("role")

    try:
        report = ReportService.get_class_report(
            actor_id=actor_id,
            actor_role=actor_role,
            class_id=class_id,
            subject_id=subject_id,
            term_label=term_label,
        )
        return success_response(data=report)
    except Exception as e:
        return _handle_exception(e)


@report_bp.route("/<int:report_id>", methods=["GET"])
@jwt_required()
def get_report_by_id(report_id):
    """
    Retrieve any report by ID with ownership and class-scoping enforcement.
    """
    actor_id = int(get_jwt_identity())
    claims = get_jwt()
    actor_role = claims.get("role")

    try:
        report = ReportService.get_report_by_id(
            actor_id=actor_id,
            actor_role=actor_role,
            report_id=report_id,
        )
        return success_response(data=report)
    except Exception as e:
        return _handle_exception(e)
