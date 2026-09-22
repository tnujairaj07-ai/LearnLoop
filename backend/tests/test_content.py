import pytest

from app.models.academic import Subject, Topic
from app.models.content import ErrorTag, Question
from app.seed.seed_data import seed_demo_data
from app.services.auth_service import clear_revoked_tokens


@pytest.fixture(autouse=True)
def clean_token_blocklist():
    clear_revoked_tokens()
    yield
    clear_revoked_tokens()


@pytest.fixture()
def seeded_client(app, client):
    with app.app_context():
        seed_demo_data("test-pilot-pass")
    return client


def _login(client, email, password="test-pilot-pass"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    token = resp.get_json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# -------------------------------------------------------------
# Curriculum & Academic Hierarchy Tests
# -------------------------------------------------------------
def test_get_subjects(seeded_client):
    headers = _login(seeded_client, "student.a@learnloop.demo")
    resp = seeded_client.get("/api/content/subjects", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    subjects = data["data"]["subjects"]
    assert len(subjects) >= 1
    math_subj = next(s for s in subjects if s["code"] == "MATH-9-DEMO")
    assert math_subj["name"] == "Mathematics"
    assert math_subj["topics_count"] == 5


def test_get_subject_details(seeded_client):
    headers = _login(seeded_client, "student.a@learnloop.demo")
    # Fetch list first to obtain Math ID
    list_resp = seeded_client.get("/api/content/subjects", headers=headers)
    subj_id = list_resp.get_json()["data"]["subjects"][0]["id"]

    resp = seeded_client.get(f"/api/content/subjects/{subj_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    subj = data["data"]["subject"]
    assert subj["code"] == "MATH-9-DEMO"
    topics = subj["topics"]
    assert len(topics) == 5
    # Verify ordering by order_index
    order_indices = [t["order_index"] for t in topics]
    assert order_indices == sorted(order_indices)


def test_create_subject_admin_only(seeded_client):
    admin_headers = _login(seeded_client, "admin@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Student cannot create subject (403)
    forbidden_resp = seeded_client.post(
        "/api/content/subjects",
        json={"name": "Science", "code": "SCI9", "description": "Grade 9 Science"},
        headers=student_headers,
    )
    assert forbidden_resp.status_code == 403

    # Admin can create subject (201)
    create_resp = seeded_client.post(
        "/api/content/subjects",
        json={"name": "Science", "code": "SCI9", "description": "Grade 9 Science"},
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    assert create_resp.get_json()["data"]["subject"]["code"] == "SCI9"


def test_get_topic_details_with_skills_and_resources(seeded_client):
    headers = _login(seeded_client, "student.a@learnloop.demo")
    resp = seeded_client.get("/api/content/topics/1", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    topic = data["data"]["topic"]
    assert topic["title"] == "Fractions"
    assert len(topic["skills"]) >= 2
    assert "resources" in topic


def test_create_topic_and_skill_teacher(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # Create topic
    topic_resp = seeded_client.post(
        "/api/content/topics",
        json={
            "subject_id": 1,
            "title": "Coordinate Geometry",
            "description": "Cartesian plane and coordinates.",
            "order_index": 10,
            "mastery_threshold": 85.0,
        },
        headers=teacher_headers,
    )
    assert topic_resp.status_code == 201
    topic_id = topic_resp.get_json()["data"]["topic"]["id"]

    # Create skill under this new topic
    skill_resp = seeded_client.post(
        "/api/content/skills",
        json={"topic_id": topic_id, "name": "Plotting points", "description": "Plot points in (x, y)."},
        headers=teacher_headers,
    )
    assert skill_resp.status_code == 201
    assert skill_resp.get_json()["data"]["skill"]["name"] == "Plotting points"


# -------------------------------------------------------------
# Learning Resources & Error Tags Tests
# -------------------------------------------------------------
def test_create_resource_validation(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # Invalid URL scheme
    bad_url_resp = seeded_client.post(
        "/api/content/resources",
        json={
            "topic_id": 1,
            "title": "Bad Resource",
            "resource_type": "video",
            "url_or_path": "ftp://example.com/bad",
            "difficulty": 1,
        },
        headers=teacher_headers,
    )
    assert bad_url_resp.status_code == 400

    # Invalid difficulty
    bad_diff_resp = seeded_client.post(
        "/api/content/resources",
        json={
            "topic_id": 1,
            "title": "Bad Resource",
            "resource_type": "video",
            "url_or_path": "https://example.com/video1",
            "difficulty": 5,
        },
        headers=teacher_headers,
    )
    assert bad_diff_resp.status_code == 400

    # Valid resource
    valid_resp = seeded_client.post(
        "/api/content/resources",
        json={
            "topic_id": 1,
            "title": "Fractions Visual Guide",
            "resource_type": "video",
            "url_or_path": "https://learnloop.example/fractions-guide",
            "description": "A video guide explaining equivalent fractions.",
            "difficulty": 1,
            "approved": True,
        },
        headers=teacher_headers,
    )
    assert valid_resp.status_code == 201
    assert valid_resp.get_json()["data"]["resource"]["title"] == "Fractions Visual Guide"


def test_get_and_create_error_tags(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # List seeded error tags
    list_resp = seeded_client.get("/api/content/error-tags", headers=student_headers)
    assert list_resp.status_code == 200
    tags = list_resp.get_json()["data"]["error_tags"]
    assert len(tags) >= 5
    tag_names = [t["name"] for t in tags]
    assert "sign_error" in tag_names

    # Teacher creates a new error tag
    create_resp = seeded_client.post(
        "/api/content/error-tags",
        json={"name": "bracket_expansion_error", "description": "Failed to distribute negative through brackets."},
        headers=teacher_headers,
    )
    assert create_resp.status_code == 201
    assert create_resp.get_json()["data"]["error_tag"]["name"] == "bracket_expansion_error"


# -------------------------------------------------------------
# Question Bank: Authoring, Validation, and Student-Safe Views
# -------------------------------------------------------------
def test_get_questions_teacher_view_includes_full_instructional_metadata(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    resp = seeded_client.get("/api/content/questions?topic_id=1&per_page=5", headers=teacher_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    items = data["data"]["items"]
    assert len(items) > 0

    first_q = items[0]
    # Teacher view must include answers, explanations, and error tags
    assert "correct_answer" in first_q
    assert first_q["correct_answer"] is not None
    assert "explanation" in first_q
    assert first_q["explanation"] is not None
    assert "error_tags" in first_q
    assert isinstance(first_q["error_tags"], list)


def test_get_questions_student_view_strictly_strips_sensitive_data(seeded_client):
    """
    CRITICAL ANTI-CHEATING TEST:
    Verify that when questions are requested by a student, correct_answer,
    explanation, and error_tags are NEVER included in the response.
    """
    student_headers = _login(seeded_client, "student.a@learnloop.demo")
    resp = seeded_client.get("/api/content/questions?topic_id=1&per_page=5", headers=student_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    items = data["data"]["items"]
    assert len(items) > 0

    for q in items:
        # Crucial security invariants:
        assert "correct_answer" not in q, f"SECURITY VIOLATION: correct_answer exposed to student in question {q['id']}"
        assert "explanation" not in q, f"SECURITY VIOLATION: explanation exposed to student in question {q['id']}"
        assert "error_tags" not in q, f"SECURITY VIOLATION: error_tags exposed to student in question {q['id']}"
        # Safe fields should remain present:
        assert "id" in q
        assert "question_text" in q
        assert "options" in q
        assert "difficulty" in q


def test_get_single_question_student_safe(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    teacher_resp = seeded_client.get("/api/content/questions/1", headers=teacher_headers)
    assert teacher_resp.status_code == 200
    assert "correct_answer" in teacher_resp.get_json()["data"]["question"]

    student_resp = seeded_client.get("/api/content/questions/1", headers=student_headers)
    assert student_resp.status_code == 200
    assert "correct_answer" not in student_resp.get_json()["data"]["question"]
    assert "explanation" not in student_resp.get_json()["data"]["question"]


def test_create_question_mcq_success(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    payload = {
        "topic_id": 1,
        "question_type": "mcq",
        "question_text": "What is 2/4 simplified to its lowest term?",
        "options": [
            {"id": "a", "text": "1/4"},
            {"id": "b", "text": "1/2"},
            {"id": "c", "text": "2/2"},
            {"id": "d", "text": "3/4"},
        ],
        "correct_answer": "b",
        "explanation": "Divide both numerator and denominator by their greatest common divisor 2: 2/4 = 1/2.",
        "hint": "Find the greatest common factor of 2 and 4.",
        "difficulty": 1,
        "approved": True,
        "error_tags": [{"error_tag_id": 1, "option_or_pattern": "a"}],
    }

    create_resp = seeded_client.post("/api/content/questions", json=payload, headers=teacher_headers)
    assert create_resp.status_code == 201
    created_q = create_resp.get_json()["data"]["question"]
    assert created_q["correct_answer"] == "b"
    assert created_q["difficulty"] == 1
    assert len(created_q["error_tags"]) == 1
    assert created_q["error_tags"][0]["name"] == "sign_error"


def test_create_question_validation_errors(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # 1. Missing correct answer
    resp1 = seeded_client.post(
        "/api/content/questions",
        json={
            "topic_id": 1,
            "question_type": "mcq",
            "question_text": "A question without answer",
            "options": [{"id": "a", "text": "1"}, {"id": "b", "text": "2"}],
            "explanation": "Explanation",
            "hint": "Hint",
            "difficulty": 1,
        },
        headers=teacher_headers,
    )
    assert resp1.status_code == 400
    assert "correct_answer" in resp1.get_json()["message"]

    # 2. Invalid difficulty
    resp2 = seeded_client.post(
        "/api/content/questions",
        json={
            "topic_id": 1,
            "question_type": "numeric",
            "question_text": "Evaluate 10 + 5",
            "correct_answer": "15",
            "explanation": "10 + 5 = 15",
            "hint": "Add them",
            "difficulty": 99,
        },
        headers=teacher_headers,
    )
    assert resp2.status_code == 400
    assert "difficulty" in resp2.get_json()["message"]

    # 3. Correct answer doesn't match any option id
    resp3 = seeded_client.post(
        "/api/content/questions",
        json={
            "topic_id": 1,
            "question_type": "mcq",
            "question_text": "Option mismatch question",
            "options": [{"id": "a", "text": "Choice A"}, {"id": "b", "text": "Choice B"}],
            "correct_answer": "z",
            "explanation": "Explanation",
            "hint": "Hint",
            "difficulty": 1,
        },
        headers=teacher_headers,
    )
    assert resp3.status_code == 400
    assert "does not match" in resp3.get_json()["message"]


def test_question_approval_and_deletion(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    admin_headers = _login(seeded_client, "admin@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Teacher changes approval
    approval_resp = seeded_client.patch(
        "/api/content/questions/1/approval",
        json={"approved": False},
        headers=teacher_headers,
    )
    assert approval_resp.status_code == 200
    assert approval_resp.get_json()["data"]["approved"] is False

    # Student cannot change approval (403)
    forbid_resp = seeded_client.patch(
        "/api/content/questions/1/approval",
        json={"approved": True},
        headers=student_headers,
    )
    assert forbid_resp.status_code == 403

    # Teacher cannot delete question (admin only)
    teacher_del_resp = seeded_client.delete("/api/content/questions/1", headers=teacher_headers)
    assert teacher_del_resp.status_code == 403

    # Admin deletes question
    admin_del_resp = seeded_client.delete("/api/content/questions/1", headers=admin_headers)
    assert admin_del_resp.status_code == 200
    assert admin_del_resp.get_json()["data"]["deleted"] is True


# -------------------------------------------------------------
# Admin: Class, Enrollment, and Teacher Assignment Tests
# -------------------------------------------------------------
def test_admin_classes_and_enrollments(seeded_client):
    admin_headers = _login(seeded_client, "admin@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Student cannot access /api/admin/classes (403)
    forbid_resp = seeded_client.get("/api/admin/classes", headers=student_headers)
    assert forbid_resp.status_code == 403

    # Admin lists classes
    list_resp = seeded_client.get("/api/admin/classes", headers=admin_headers)
    assert list_resp.status_code == 200
    classes = list_resp.get_json()["data"]["classes"]
    assert len(classes) >= 1
    class_id = classes[0]["id"]

    # Admin gets class details with roster
    detail_resp = seeded_client.get(f"/api/admin/classes/{class_id}", headers=admin_headers)
    assert detail_resp.status_code == 200
    classroom = detail_resp.get_json()["data"]["class"]
    assert len(classroom["students"]) >= 20
    assert len(classroom["teachers"]) >= 1

    # Admin creates a new section
    new_class_resp = seeded_client.post(
        "/api/admin/classes",
        json={"name": "Class 9-B", "grade": "9", "section": "B", "academic_year": "2026-2027"},
        headers=admin_headers,
    )
    assert new_class_resp.status_code == 201
    new_class_id = new_class_resp.get_json()["data"]["class"]["id"]

    # Enroll student in the new class
    enroll_resp = seeded_client.post(
        f"/api/admin/classes/{new_class_id}/enrollments",
        json={"student_id": 3},  # student.a
        headers=admin_headers,
    )
    assert enroll_resp.status_code == 201
    assert enroll_resp.get_json()["data"]["status"] == "active"
