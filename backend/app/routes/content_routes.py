from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.services.content_service import ContentService, ContentValidationError
from app.utils.decorators import admin_required, teacher_required
from app.utils.responses import error_response, success_response

content_bp = Blueprint("content", __name__, url_prefix="/api/content")


# -------------------------------------------------------------
# Curriculum: Subjects, Topics, Skills
# -------------------------------------------------------------
@content_bp.route("/subjects", methods=["GET"])
@jwt_required()
def list_subjects():
    """Retrieve all academic subjects."""
    subjects = ContentService.get_subjects()
    return success_response(data={"subjects": subjects})


@content_bp.route("/subjects/<int:subject_id>", methods=["GET"])
@jwt_required()
def get_subject(subject_id):
    """Retrieve subject details with ordered topics and skills."""
    try:
        subject = ContentService.get_subject_by_id(subject_id)
        return success_response(data={"subject": subject})
    except LookupError as e:
        return error_response(message=str(e), status_code=404)


@content_bp.route("/subjects", methods=["POST"])
@admin_required
def create_subject():
    """Create a new academic subject (admin only)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    try:
        subject = ContentService.create_subject(data)
        return success_response(data={"subject": subject}, message="Subject created successfully.", status_code=201)
    except ContentValidationError as e:
        return error_response(e.message, errors=[e.to_dict()], status_code=400)


@content_bp.route("/topics/<int:topic_id>", methods=["GET"])
@jwt_required()
def get_topic(topic_id):
    """Retrieve topic details with skills, prerequisites, and resources."""
    try:
        topic = ContentService.get_topic_details(topic_id)
        return success_response(data={"topic": topic})
    except LookupError as e:
        return error_response(message=str(e), status_code=404)


@content_bp.route("/topics", methods=["POST"])
@teacher_required
def create_topic():
    """Create a new topic under a subject (teacher or admin)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    try:
        topic = ContentService.create_topic(data)
        return success_response(data={"topic": topic}, message="Topic created successfully.", status_code=201)
    except ContentValidationError as e:
        return error_response(e.message, errors=[e.to_dict()], status_code=400)


@content_bp.route("/skills", methods=["POST"])
@teacher_required
def create_skill():
    """Create a new skill under a topic (teacher or admin)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    try:
        skill = ContentService.create_skill(data)
        return success_response(data={"skill": skill}, message="Skill created successfully.", status_code=201)
    except ContentValidationError as e:
        return error_response(e.message, errors=[e.to_dict()], status_code=400)


# -------------------------------------------------------------
# Learning Resources
# -------------------------------------------------------------
@content_bp.route("/resources", methods=["GET"])
@jwt_required()
def list_resources():
    """Retrieve educational resources, filtered by topic, difficulty, or type."""
    claims = get_jwt()
    user_role = claims.get("role", "student")

    topic_id = request.args.get("topic_id", type=int)
    difficulty = request.args.get("difficulty", type=int)
    resource_type = request.args.get("resource_type")

    # Students can only view approved resources; teachers/admins can request unapproved too
    approved_only = True
    if user_role in ("teacher", "admin"):
        approved_param = request.args.get("approved_only")
        if approved_param is not None and approved_param.lower() in ("false", "0"):
            approved_only = False

    resources = ContentService.get_resources(
        topic_id=topic_id,
        difficulty=difficulty,
        resource_type=resource_type,
        approved_only=approved_only,
    )
    return success_response(data={"resources": resources})


@content_bp.route("/resources", methods=["POST"])
@teacher_required
def create_resource():
    """Create a new educational resource."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    user_id = int(get_jwt_identity())
    try:
        resource = ContentService.create_resource(data, user_id=user_id)
        return success_response(data={"resource": resource}, message="Resource created successfully.", status_code=201)
    except ContentValidationError as e:
        return error_response(e.message, errors=[e.to_dict()], status_code=400)


# -------------------------------------------------------------
# Error Pattern Tags
# -------------------------------------------------------------
@content_bp.route("/error-tags", methods=["GET"])
@jwt_required()
def list_error_tags():
    """List all recognized misconception and error-pattern tags."""
    tags = ContentService.get_error_tags()
    return success_response(data={"error_tags": tags})


@content_bp.route("/error-tags", methods=["POST"])
@teacher_required
def create_error_tag():
    """Define a new error-pattern tag."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    try:
        tag = ContentService.create_error_tag(data)
        return success_response(data={"error_tag": tag}, message="Error tag created successfully.", status_code=201)
    except ContentValidationError as e:
        return error_response(e.message, errors=[e.to_dict()], status_code=400)


# -------------------------------------------------------------
# Question Bank: Filtering, Authoring, and Student-Safe Views
# -------------------------------------------------------------
@content_bp.route("/questions", methods=["GET"])
@jwt_required()
def list_questions():
    """
    Retrieve questions with pagination and filters.
    If the caller is a student, student-safe serialization is strictly enforced
    (answer keys, explanations, and error tags are omitted).
    """
    claims = get_jwt()
    user_role = claims.get("role", "student")
    is_student_safe = (user_role == "student")

    topic_id = request.args.get("topic_id", type=int)
    skill_id = request.args.get("skill_id", type=int)
    difficulty = request.args.get("difficulty", type=int)
    question_type = request.args.get("question_type")
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    approved = None
    if user_role in ("teacher", "admin"):
        approved_param = request.args.get("approved")
        if approved_param is not None:
            approved = approved_param.lower() in ("true", "1")

    result = ContentService.get_questions(
        topic_id=topic_id,
        skill_id=skill_id,
        difficulty=difficulty,
        question_type=question_type,
        approved=approved,
        page=page,
        per_page=per_page,
        is_student_safe=is_student_safe,
    )
    return success_response(data=result)


@content_bp.route("/questions/<int:question_id>", methods=["GET"])
@jwt_required()
def get_question(question_id):
    """Retrieve single question detail, automatically student-safe filtered for students."""
    claims = get_jwt()
    user_role = claims.get("role", "student")
    is_student_safe = (user_role == "student")

    try:
        question = ContentService.get_question_by_id(question_id, is_student_safe=is_student_safe)
        return success_response(data={"question": question})
    except LookupError as e:
        return error_response(message=str(e), status_code=404)


@content_bp.route("/questions", methods=["POST"])
@teacher_required
def create_question():
    """Create a new question with strict metadata and options validation."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    user_id = int(get_jwt_identity())
    try:
        question = ContentService.create_question(data, user_id=user_id)
        return success_response(data={"question": question}, message="Question created successfully.", status_code=201)
    except ContentValidationError as e:
        return error_response(e.message, errors=[e.to_dict()], status_code=400)


@content_bp.route("/questions/<int:question_id>", methods=["PUT"])
@teacher_required
def update_question(question_id):
    """Update instructional metadata of an existing question."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be a valid JSON object.", status_code=400)

    try:
        question = ContentService.update_question(question_id, data)
        return success_response(data={"question": question}, message="Question updated successfully.")
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
    except ContentValidationError as e:
        return error_response(e.message, errors=[e.to_dict()], status_code=400)


@content_bp.route("/questions/<int:question_id>/approval", methods=["PATCH"])
@teacher_required
def set_question_approval(question_id):
    """Approve or reject a question for assessment inclusion."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "approved" not in data:
        return error_response("Request body must include 'approved' boolean.", status_code=400)

    try:
        result = ContentService.set_question_approval(question_id, data["approved"])
        return success_response(data=result, message=f"Question approval set to {result['approved']}.")
    except LookupError as e:
        return error_response(message=str(e), status_code=404)


@content_bp.route("/questions/<int:question_id>", methods=["DELETE"])
@admin_required
def delete_question(question_id):
    """Delete a question (admin only)."""
    try:
        result = ContentService.delete_question(question_id)
        return success_response(data=result, message="Question deleted successfully.")
    except LookupError as e:
        return error_response(message=str(e), status_code=404)
