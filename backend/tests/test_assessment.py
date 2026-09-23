import pytest

from app.models.academic import Subject, Topic
from app.models.assessment import Assessment, AssessmentQuestion, Attempt
from app.models.content import Question
from app.models.user import User
from app.seed.seed_data import seed_demo_data
from app.services.auth_service import clear_revoked_tokens
from app.services.scoring_service import ScoringService


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
# Assessment Management Tests
# -------------------------------------------------------------
def test_list_assessments_role_filtering(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # Student lists assessments (only sees published assessments for Class 9-A)
    s_resp = seeded_client.get("/api/assessments", headers=student_headers)
    assert s_resp.status_code == 200
    s_data = s_resp.get_json()
    assert s_data["success"] is True
    s_assessments = s_data["data"]["assessments"]
    assert len(s_assessments) >= 1
    titles = [a["title"] for a in s_assessments]
    assert "Class 9 Mathematics diagnostic" in titles

    # Teacher lists assessments
    t_resp = seeded_client.get("/api/assessments", headers=teacher_headers)
    assert t_resp.status_code == 200
    t_assessments = t_resp.get_json()["data"]["assessments"]
    assert len(t_assessments) >= 1


def test_get_assessment_student_safe_filtering(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # Get diagnostic assessment ID
    list_resp = seeded_client.get("/api/assessments", headers=student_headers)
    diag_id = next(
        a["id"] for a in list_resp.get_json()["data"]["assessments"]
        if a["title"] == "Class 9 Mathematics diagnostic"
    )

    # Student requests assessment details: verify anti-cheating guarantees
    s_resp = seeded_client.get(f"/api/assessments/{diag_id}", headers=student_headers)
    assert s_resp.status_code == 200
    s_data = s_resp.get_json()["data"]["assessment"]
    assert len(s_data["questions"]) == 30

    for q in s_data["questions"]:
        assert "correct_answer" not in q, f"SECURITY BREACH: correct_answer exposed in {q['id']}"
        assert "explanation" not in q, f"SECURITY BREACH: explanation exposed in {q['id']}"
        assert "error_tags" not in q, f"SECURITY BREACH: error_tags exposed in {q['id']}"
        assert "order_index" in q
        assert "points" in q
        assert "options" in q

    # Teacher requests same assessment details: verify complete metadata
    t_resp = seeded_client.get(f"/api/assessments/{diag_id}", headers=teacher_headers)
    assert t_resp.status_code == 200
    t_data = t_resp.get_json()["data"]["assessment"]
    first_q = t_data["questions"][0]
    assert "correct_answer" in first_q
    assert "explanation" in first_q
    assert "error_tags" in first_q


def test_create_and_publish_assessment(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Student cannot create assessment (403)
    forbid_resp = seeded_client.post(
        "/api/assessments",
        json={
            "title": "Student Quiz",
            "assessment_type": "practice",
            "subject_id": 1,
            "class_id": 1,
            "questions": [{"question_id": 1, "order_index": 1, "points": 2.0}],
        },
        headers=student_headers,
    )
    assert forbid_resp.status_code == 403

    # Teacher creates assessment
    create_resp = seeded_client.post(
        "/api/assessments",
        json={
            "title": "Polynomials Quick Check",
            "assessment_type": "practice",
            "subject_id": 1,
            "class_id": 1,
            "status": "draft",
            "questions": [
                {"question_id": 1, "order_index": 1, "points": 1.0},
                {"question_id": 2, "order_index": 2, "points": 1.0},
            ],
        },
        headers=teacher_headers,
    )
    assert create_resp.status_code == 201
    created_a = create_resp.get_json()["data"]["assessment"]
    assert created_a["status"] == "draft"
    assert created_a["question_count"] == 2
    assert created_a["total_points"] == 2.0

    # Publish assessment
    patch_resp = seeded_client.patch(
        f"/api/assessments/{created_a['id']}/status",
        json={"status": "published"},
        headers=teacher_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.get_json()["data"]["status"] == "published"


# -------------------------------------------------------------
# Attempt Lifecycle & Answer Submission Tests
# -------------------------------------------------------------
def test_start_attempt_and_resume_idempotency(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # 1. Start attempt on diagnostic assessment (ID 1)
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    assert start_resp.status_code == 200
    attempt_data = start_resp.get_json()["data"]["attempt"]
    assert attempt_data["status"] == "in_progress"
    attempt_id = attempt_data["attempt_id"]
    assert attempt_data["total_questions"] == 30

    # 2. Resuming an in-progress attempt returns the same attempt (idempotent)
    resume_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    assert resume_resp.status_code == 200
    resumed_data = resume_resp.get_json()["data"]["attempt"]
    assert resumed_data["attempt_id"] == attempt_id
    assert resumed_data["status"] == "in_progress"


def test_autosave_answers_during_attempt(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Start attempt
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    attempt_data = start_resp.get_json()["data"]["attempt"]
    attempt_id = attempt_data["attempt_id"]
    q1_id = attempt_data["questions"][0]["id"]
    q2_id = attempt_data["questions"][1]["id"]

    # Save answer for question 1 (b is correct in demo seed)
    save_resp1 = seeded_client.post(
        f"/api/attempts/{attempt_id}/answers",
        json={"question_id": q1_id, "answer_text": "b", "time_spent_seconds": 15},
        headers=student_headers,
    )
    assert save_resp1.status_code == 200
    assert save_resp1.get_json()["data"]["saved"] is True
    assert save_resp1.get_json()["data"]["answer_text"] == "b"

    # Save answer for question 2 (a is distractor with sign_error tag)
    save_resp2 = seeded_client.post(
        f"/api/attempts/{attempt_id}/answers",
        json={"question_id": q2_id, "answer_text": "a", "time_spent_seconds": 20},
        headers=student_headers,
    )
    assert save_resp2.status_code == 200
    assert save_resp2.get_json()["data"]["answer_text"] == "a"

    # Resuming attempt reflects saved answers without exposing correctness
    resume_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    qs = resume_resp.get_json()["data"]["attempt"]["questions"]
    assert qs[0]["saved_answer"] == "b"
    assert qs[1]["saved_answer"] == "a"
    assert "correct_answer" not in qs[0]
    assert "is_correct" not in qs[0]


def test_submit_attempt_and_scoring(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Start attempt
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    attempt_data = start_resp.get_json()["data"]["attempt"]
    attempt_id = attempt_data["attempt_id"]

    # Answer questions: answer first 10 questions correctly ("b")
    for q in attempt_data["questions"][:10]:
        seeded_client.post(
            f"/api/attempts/{attempt_id}/answers",
            json={"question_id": q["id"], "answer_text": "b", "time_spent_seconds": 10},
            headers=student_headers,
        )

    # Submit attempt
    submit_resp = seeded_client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)
    assert submit_resp.status_code == 200
    result = submit_resp.get_json()["data"]["result"]
    assert result["status"] == "scored"
    assert result["score"] == 10.0
    assert result["total_points_possible"] == 30.0
    assert result["percentage"] == round((10.0 / 30.0) * 100.0, 2)
    assert result["submitted_at"] is not None


def test_deterministic_scoring_and_error_tag_detection(seeded_client):
    # Test ScoringService directly for deterministic properties
    with seeded_client.application.app_context():
        # 1. MCQ evaluation
        q1 = Question.query.filter_by(id=1).first()
        is_corr, tag_id = ScoringService.evaluate_answer(q1, "b")
        assert is_corr is True
        assert tag_id is None

        # 2. MCQ incorrect option with known error tag ('a' was tagged with sign_error in seed)
        is_corr, tag_id = ScoringService.evaluate_answer(q1, "a")
        assert is_corr is False
        assert tag_id is not None  # Matched sign_error tag

        # 3. Numeric evaluation with formatting tolerance
        numeric_q = Question(
            topic_id=1,
            question_type="numeric",
            question_text="Evaluate 5 * 6",
            correct_answer="30",
            explanation="5 * 6 = 30",
            hint="Multiply 5 by 6",
            difficulty=1,
            approved=True,
        )
        is_corr, _ = ScoringService.evaluate_answer(numeric_q, "30.0")
        assert is_corr is True
        is_corr, _ = ScoringService.evaluate_answer(numeric_q, " 30 ")
        assert is_corr is True
        is_corr, _ = ScoringService.evaluate_answer(numeric_q, "31")
        assert is_corr is False


def test_get_attempt_result_detailed_breakdown(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Start, answer, and submit attempt
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    attempt_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]
    q1_id = start_resp.get_json()["data"]["attempt"]["questions"][0]["id"]

    # Save answer 'a' (distractor with error tag)
    seeded_client.post(
        f"/api/attempts/{attempt_id}/answers",
        json={"question_id": q1_id, "answer_text": "a", "time_spent_seconds": 25},
        headers=student_headers,
    )
    # Submit
    seeded_client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)

    # Fetch post-submission result
    result_resp = seeded_client.get(f"/api/attempts/{attempt_id}/result", headers=student_headers)
    assert result_resp.status_code == 200
    res_data = result_resp.get_json()["data"]["result"]
    assert res_data["status"] == "scored"
    assert len(res_data["questions"]) == 30

    first_item = res_data["questions"][0]
    assert first_item["student_answer"] == "a"
    assert first_item["correct_answer"] == "b"
    assert first_item["is_correct"] is False
    assert first_item["points_earned"] == 0.0
    assert first_item["explanation"] is not None
    # Verify misconception tag was detected
    assert first_item["detected_error_tag"] is not None
    assert first_item["detected_error_tag"]["name"] == "sign_error"


def test_anti_tampering_and_lockdown_after_submission(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Start & submit
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    attempt_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]
    seeded_client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)

    # 1. Saving answers after submission is rejected (400)
    save_after_sub = seeded_client.post(
        f"/api/attempts/{attempt_id}/answers",
        json={"question_id": 1, "answer_text": "b"},
        headers=student_headers,
    )
    assert save_after_sub.status_code == 400
    assert "already scored" in save_after_sub.get_json()["message"]

    # 2. Submitting again is idempotent (returns scored result without error)
    resubmit = seeded_client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)
    assert resubmit.status_code == 200
    assert resubmit.get_json()["data"]["result"]["status"] == "scored"

    # 3. Starting assessment again after completion is rejected (400)
    restart = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    assert restart.status_code == 400
    assert "already been submitted" in restart.get_json()["message"]


def test_cross_student_security_guards(seeded_client):
    student_a_headers = _login(seeded_client, "student.a@learnloop.demo")
    student_b_headers = _login(seeded_client, "student.b@learnloop.demo")

    # Student A starts attempt
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_a_headers)
    attempt_a_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]

    # Student B cannot save answers to Student A's attempt (403)
    save_b = seeded_client.post(
        f"/api/attempts/{attempt_a_id}/answers",
        json={"question_id": 1, "answer_text": "c"},
        headers=student_b_headers,
    )
    assert save_b.status_code == 403

    # Student B cannot submit Student A's attempt (403)
    submit_b = seeded_client.post(f"/api/attempts/{attempt_a_id}/submit", headers=student_b_headers)
    assert submit_b.status_code == 403

    # Student A submits attempt
    seeded_client.post(f"/api/attempts/{attempt_a_id}/submit", headers=student_a_headers)

    # Student B cannot view Student A's result (403)
    result_b = seeded_client.get(f"/api/attempts/{attempt_a_id}/result", headers=student_b_headers)
    assert result_b.status_code == 403
