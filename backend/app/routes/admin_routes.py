from flask import Blueprint, request

from app.services.academic_admin_service import AcademicAdminService
from app.utils.decorators import admin_required, teacher_required
from app.utils.responses import error_response, success_response

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/classes", methods=["GET"])
@teacher_required
def list_classes():
    """Retrieve all classes with enrollment statistics."""
    classes = AcademicAdminService.get_classes()
    return success_response(data={"classes": classes})


@admin_bp.route("/classes", methods=["POST"])
@admin_required
def create_class():
    """Create a new classroom section (admin only)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    try:
        classroom = AcademicAdminService.create_class(data)
        return success_response(data={"class": classroom}, message="Class created successfully.", status_code=201)
    except ValueError as e:
        return error_response(str(e), status_code=400)


@admin_bp.route("/classes/<int:class_id>", methods=["GET"])
@teacher_required
def get_class(class_id):
    """Retrieve class details with enrolled students and assigned teachers."""
    try:
        classroom = AcademicAdminService.get_class_details(class_id)
        return success_response(data={"class": classroom})
    except LookupError as e:
        return error_response(str(e), status_code=404)


@admin_bp.route("/classes/<int:class_id>/enrollments", methods=["POST"])
@admin_required
def enroll_student(class_id):
    """Enroll a student in a class (admin only)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "student_id" not in data:
        return error_response("student_id is required in request body.", status_code=400)

    try:
        result = AcademicAdminService.enroll_student(class_id, data["student_id"])
        return success_response(data=result, message="Student enrolled successfully.", status_code=201)
    except LookupError as e:
        return error_response(str(e), status_code=404)
    except ValueError as e:
        return error_response(str(e), status_code=400)


@admin_bp.route("/teacher-assignments", methods=["POST"])
@admin_required
def assign_teacher():
    """Assign a teacher to a class and subject (admin only)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    teacher_id = data.get("teacher_id")
    class_id = data.get("class_id")
    subject_id = data.get("subject_id")

    if not teacher_id or not class_id or not subject_id:
        return error_response("teacher_id, class_id, and subject_id are all required.", status_code=400)

    try:
        result = AcademicAdminService.assign_teacher(teacher_id, class_id, subject_id)
        return success_response(data=result, message="Teacher assigned successfully.", status_code=201)
    except LookupError as e:
        return error_response(str(e), status_code=404)
    except ValueError as e:
        return error_response(str(e), status_code=400)
