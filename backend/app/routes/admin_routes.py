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


@admin_bp.route("/audit-logs", methods=["GET"])
@admin_required
def list_audit_logs():
    """Query immutable audit logs for governance and compliance inspection (admin only)."""
    from app.services.audit_service import AuditService

    actor_id = request.args.get("actor_id", type=int)
    action = request.args.get("action")
    entity_type = request.args.get("entity_type")
    entity_id = request.args.get("entity_id")
    limit = min(request.args.get("limit", default=50, type=int), 100)
    offset = max(request.args.get("offset", default=0, type=int), 0)

    logs, total = AuditService.list_audit_logs(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        limit=limit,
        offset=offset,
    )
    return success_response(
        data={"audit_logs": logs, "total_count": total, "limit": limit, "offset": offset}
    )


@admin_bp.route("/users/<int:user_id>/privacy-purge", methods=["DELETE"])
@admin_required
def privacy_purge_user(user_id):
    """Anonymize or purge student PII for privacy and data retention compliance (admin only)."""
    from flask_jwt_extended import get_jwt_identity
    from app.extensions import db
    from app.models.user import User
    from app.services.audit_service import AuditService

    admin_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return error_response(f"User with ID {user_id} not found.", status_code=404)

    # Anonymize PII
    user.name = f"Learner_{user.id}"
    user.email = f"anonymized_{user.id}@learnloop.local"
    user.is_active = False
    db.session.commit()

    AuditService.log_event(
        action="privacy.purge",
        entity_type="User",
        entity_id=user.id,
        actor_id=admin_id,
        metadata_json={"purged_user_id": user.id},
    )

    return success_response(
        message="User PII successfully purged and anonymized in compliance with retention policy."
    )

