import pytest

from app.models.academic import Topic
from app.models.assessment import Answer, Attempt
from app.models.content import Question
from app.models.mastery import ErrorPatternFlag, MasteryRecord, Recommendation
from app.seed.seed_data import seed_demo_data
from app.services.auth_service import clear_revoked_tokens
from app.services.error_pattern_service import ErrorPatternService
from app.services.mastery_service import MasteryService
from app.services.recommendation_service import RecommendationService


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
# 1. Heuristic Mastery Calculation Unit Tests
# -------------------------------------------------------------
def test_mastery_bands():
    assert MasteryService.get_mastery_band(25.0) == "Needs strong support"
    assert MasteryService.get_mastery_band(39.9) == "Needs strong support"
    assert MasteryService.get_mastery_band(40.0) == "Developing"
    assert MasteryService.get_mastery_band(59.9) == "Developing"
    assert MasteryService.get_mastery_band(60.0) == "Proficient"
    assert MasteryService.get_mastery_band(79.9) == "Proficient"
    assert MasteryService.get_mastery_band(80.0) == "Secure"
    assert MasteryService.get_mastery_band(100.0) == "Secure"


def test_mastery_unassessed_baseline(seeded_client):
    with seeded_client.application.app_context():
        # Student 3 (student.a) has not submitted any attempts yet
        metrics = MasteryService.calculate_topic_mastery(student_id=3, topic_id=1)
        assert metrics["mastery_score"] == 0.0
        assert metrics["evidence_count"] == 0
        assert metrics["band"] == "Needs strong support"
        assert metrics["trend_component"] == 50.0


# -------------------------------------------------------------
# 2. Error Pattern Engine Unit Tests
# -------------------------------------------------------------
def test_error_pattern_threshold_requires_at_least_two_matches(seeded_client):
    with seeded_client.application.app_context():
        # Student 3 has no answers yet -> 0 flags
        flags = ErrorPatternService.detect_and_persist_flags(student_id=3, topic_id=1)
        assert len(flags) == 0


# -------------------------------------------------------------
# 3. End-to-End Learning Loop & Intelligence Integration
# -------------------------------------------------------------
def test_diagnostic_submission_triggers_mastery_flags_and_recommendations(seeded_client):
    """
    CORE ACCEPTANCE TEST:
    1. Student starts diagnostic assessment.
    2. Student submits weak performance in Fractions with repeated 'a' answers (sign_error).
    3. Transactional submit auto-scores the attempt.
    4. Intelligence pipeline automatically calculates Fractions topic mastery (< 40%).
    5. Error pattern engine flags suspected 'sign_error'.
    6. Recommendation engine generates structured remedial recommendations with actions.
    """
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # 1. Start diagnostic assessment (ID 1)
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    assert start_resp.status_code == 200
    attempt_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]
    questions = start_resp.get_json()["data"]["attempt"]["questions"]

    # In the demo seed, the first 6 questions belong to Topic 1 (Fractions).
    # Correct answer is 'b'. Distractor 'a' is tagged with 'sign_error'.
    fractions_qs = [q for q in questions if q["topic_id"] == 1]
    assert len(fractions_qs) >= 6

    # 2. Save wrong answers for Fractions items with option 'a' (repeated sign_error)
    for q in fractions_qs:
        save_resp = seeded_client.post(
            f"/api/attempts/{attempt_id}/answers",
            json={"question_id": q["id"], "answer_text": "a", "time_spent_seconds": 15},
            headers=student_headers,
        )
        assert save_resp.status_code == 200

    # 3. Submit attempt
    submit_resp = seeded_client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)
    assert submit_resp.status_code == 200
    res = submit_resp.get_json()["data"]["result"]
    assert res["status"] == "scored"

    # 4. Verify Fractions mastery snapshot was persisted
    with seeded_client.application.app_context():
        record = (
            MasteryRecord.query.filter_by(student_id=3, topic_id=1)
            .order_by(MasteryRecord.calculated_at.desc())
            .first()
        )
        assert record is not None
        assert record.evidence_count >= 6
        assert record.accuracy_component == 0.0  # All 6 were incorrect
        assert record.mastery_score < 40.0       # Needs strong support

        # 5. Verify suspected error pattern flag was created
        flag = ErrorPatternFlag.query.filter_by(student_id=3, topic_id=1, status="suspected").first()
        assert flag is not None
        assert flag.match_count >= 2
        assert flag.error_tag.name == "sign_error"

        # 6. Verify Recommendation was created
        rec = Recommendation.query.filter_by(student_id=3, topic_id=1).first()
        assert rec is not None
        assert rec.priority == "high"
        assert len(rec.actions) >= 1
        action_types = [act.action_type for act in rec.actions]
        assert "resource" in action_types or "practice" in action_types


# -------------------------------------------------------------
# 4. Student Analytics & Dashboard Endpoints Tests
# -------------------------------------------------------------
def test_student_dashboard_and_mastery_endpoints(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Trigger diagnostic submission to populate evidence
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    attempt_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]
    seeded_client.post(
        f"/api/attempts/{attempt_id}/answers",
        json={"question_id": 1, "answer_text": "b", "time_spent_seconds": 10},
        headers=student_headers,
    )
    seeded_client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)

    # 1. GET /api/student/dashboard
    dash_resp = seeded_client.get("/api/student/dashboard", headers=student_headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.get_json()
    assert dash_data["success"] is True
    data = dash_data["data"]
    assert "overall_mastery" in data
    assert "overall_band" in data
    assert len(data["topic_summaries"]) == 5
    assert len(data["recent_attempts"]) >= 1

    # 2. GET /api/student/mastery
    mastery_resp = seeded_client.get("/api/student/mastery", headers=student_headers)
    assert mastery_resp.status_code == 200
    m_data = mastery_resp.get_json()["data"]
    assert len(m_data["topics"]) == 5
    first_topic = m_data["topics"][0]
    assert "components" in first_topic
    assert "accuracy" in first_topic["components"]
    assert "difficulty" in first_topic["components"]
    assert "recency" in first_topic["components"]
    assert "trend" in first_topic["components"]
    assert "band" in first_topic

    # 3. GET /api/student/growth
    growth_resp = seeded_client.get("/api/student/growth", headers=student_headers)
    assert growth_resp.status_code == 200
    g_data = growth_resp.get_json()["data"]
    assert len(g_data["growth_timeline"]) >= 1
    assert g_data["growth_timeline"][0]["status"] == "scored"


def test_student_recommendations_and_action_completion(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Start and submit with wrong answers to trigger recommendations
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    att_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]
    seeded_client.post(
        f"/api/attempts/{att_id}/answers",
        json={"question_id": 1, "answer_text": "a", "time_spent_seconds": 10},
        headers=student_headers,
    )
    seeded_client.post(
        f"/api/attempts/{att_id}/answers",
        json={"question_id": 2, "answer_text": "a", "time_spent_seconds": 10},
        headers=student_headers,
    )
    seeded_client.post(f"/api/attempts/{att_id}/submit", headers=student_headers)

    # 1. GET /api/student/recommendations
    rec_resp = seeded_client.get("/api/student/recommendations", headers=student_headers)
    assert rec_resp.status_code == 200
    recs = rec_resp.get_json()["data"]["recommendations"]
    assert len(recs) >= 1
    first_rec = recs[0]
    rec_id = first_rec["id"]
    assert len(first_rec["actions"]) >= 1
    action_id = first_rec["actions"][0]["id"]

    # 2. Update recommendation status to in_progress
    patch_resp = seeded_client.patch(
        f"/api/student/recommendations/{rec_id}/status",
        json={"status": "in_progress"},
        headers=student_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.get_json()["data"]["recommendation"]["status"] == "in_progress"

    # 3. Complete an action item
    action_resp = seeded_client.post(
        f"/api/student/actions/{action_id}/complete",
        headers=student_headers,
    )
    assert action_resp.status_code == 200
    assert action_resp.get_json()["data"]["status"] == "completed"


def test_student_routes_role_guards(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # Teacher accessing student dashboard gets 403 Forbidden (@student_required)
    resp = seeded_client.get("/api/student/dashboard", headers=teacher_headers)
    assert resp.status_code == 403
