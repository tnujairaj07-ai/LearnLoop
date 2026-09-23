from datetime import datetime

import pytest

from app.extensions import db
from app.models.academic import Topic
from app.models.assessment import Answer, Assessment, AssessmentQuestion, Attempt
from app.models.content import Question
from app.models.governance import LearningGainRecord
from app.models.intervention import Intervention, InterventionStudent
from app.models.mastery import ErrorPatternFlag, ErrorPatternReview, MasteryRecord
from app.models.user import Class, Role, TeacherAssignment, User
from app.seed.seed_data import seed_demo_data
from app.services.auth_service import clear_revoked_tokens
from app.services.intervention_service import InterventionService
from app.services.mastery_service import MasteryService


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
# 1. Teacher Class Scoping and RBAC Isolation
# -------------------------------------------------------------
def test_teacher_classes_and_scoping(seeded_client):
    headers = _login(seeded_client, "teacher@learnloop.demo")

    # 1. List assigned classes
    resp = seeded_client.get("/api/teacher/classes", headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["success"] is True
    classes = body["data"]
    assert len(classes) == 1
    assert classes[0]["class_name"] == "Class 9-A"
    assert classes[0]["grade"] == "Class 9"
    assert classes[0]["subject_name"] == "Mathematics"
    assert classes[0]["enrolled_students_count"] == 20


def test_teacher_rbac_and_cross_class_isolation(seeded_client):
    student_headers = _login(seeded_client, "student.a@learnloop.demo")
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # 1. Student cannot access teacher endpoints
    resp = seeded_client.get("/api/teacher/classes", headers=student_headers)
    assert resp.status_code == 403

    resp = seeded_client.get("/api/teacher/classes/1/dashboard", headers=student_headers)
    assert resp.status_code == 403

    # 2. Teacher accessing an unassigned class ID (e.g. 999) gets 403 Forbidden
    resp = seeded_client.get("/api/teacher/classes/999/dashboard", headers=teacher_headers)
    assert resp.status_code == 403
    assert "not assigned" in resp.get_json()["message"]


# -------------------------------------------------------------
# 2. Teacher Class Analytics & Mastery Matrix
# -------------------------------------------------------------
def test_teacher_class_dashboard_and_matrix(seeded_client):
    headers = _login(seeded_client, "teacher@learnloop.demo")

    # 1. Class Dashboard
    resp = seeded_client.get("/api/teacher/classes/1/dashboard", headers=headers)
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["class_id"] == 1
    assert data["class_name"] == "Class 9-A"
    assert data["total_enrolled"] == 20
    assert "mastery_band_distribution" in data
    assert "Needs strong support" in data["mastery_band_distribution"]
    assert "total_assessments" in data
    assert data["total_assessments"] >= 1

    # 2. Class Mastery Matrix (Heatmap)
    resp = seeded_client.get("/api/teacher/classes/1/mastery-matrix", headers=headers)
    assert resp.status_code == 200
    matrix_data = resp.get_json()["data"]
    assert matrix_data["class_id"] == 1
    topics = matrix_data["topics"]
    assert len(topics) == 5  # 5 pilot topics
    topic_titles = [t["topic_title"] for t in topics]
    assert "Fractions" in topic_titles
    assert "Linear Equations" in topic_titles

    fractions_topic = next(t for t in topics if t["topic_title"] == "Fractions")
    assert "band_distribution" in fractions_topic
    assert "students" in fractions_topic
    assert len(fractions_topic["students"]) == 20


# -------------------------------------------------------------
# 3. Class Student Roster Diagnostic & Non-Stigmatizing Labels
# -------------------------------------------------------------
def test_teacher_class_students_diagnostic(seeded_client):
    headers = _login(seeded_client, "teacher@learnloop.demo")

    resp = seeded_client.get("/api/teacher/classes/1/students", headers=headers)
    assert resp.status_code == 200
    students = resp.get_json()["data"]["students"]
    assert len(students) == 20

    allowed_support_categories = [
        "Needs teacher support",
        "Developing",
        "Proficient",
        "Ready for next level",
    ]
    for s in students:
        assert s["support_category"] in allowed_support_categories
        # Check against forbidden harmful labels per AGENTS.md
        assert "weak" not in s["support_category"].lower()
        assert "poor" not in s["support_category"].lower()
        assert "failed" not in s["support_category"].lower()
        assert len(s["topic_masteries"]) == 5


# -------------------------------------------------------------
# 4. Assessment Item Analysis and Distractor Distribution
# -------------------------------------------------------------
def test_assessment_item_analysis(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Start and submit attempt on assessment 1
    start_resp = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    assert start_resp.status_code == 200
    attempt_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]

    # Answer question 1 correctly (option 'b') and question 2 incorrectly (option 'a', distractor)
    seeded_client.post(f"/api/attempts/{attempt_id}/answers", headers=student_headers, json={"question_id": 1, "answer_text": "b"})
    seeded_client.post(f"/api/attempts/{attempt_id}/answers", headers=student_headers, json={"question_id": 2, "answer_text": "a"})
    seeded_client.post(f"/api/attempts/{attempt_id}/submit", headers=student_headers)

    # Teacher inspects item analysis
    resp = seeded_client.get("/api/teacher/classes/1/assessments/1/item-analysis", headers=teacher_headers)
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["assessment_id"] == 1
    assert data["total_participants"] == 1
    questions = data["questions"]
    assert len(questions) > 0

    q1 = next(q for q in questions if q["question_id"] == 1)
    assert q1["accuracy_percentage"] == 100.0
    assert q1["option_distribution"].get("b") == 1

    q2 = next(q for q in questions if q["question_id"] == 2)
    assert q2["accuracy_percentage"] == 0.0
    assert q2["option_distribution"].get("a") == 1
    assert len(q2["detected_error_tags"]) >= 1


# -------------------------------------------------------------
# 5. Teacher Error Pattern Oversight & Override
# -------------------------------------------------------------
def test_teacher_error_pattern_aggregation_and_review(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    with seeded_client.application.app_context():
        # Create an ErrorPatternFlag for student 3 (student.a)
        flag = ErrorPatternFlag(
            student_id=3,
            topic_id=1,
            error_tag_id=1,
            evidence_count=2,
            incorrect_count=2,
            match_count=2,
            evidence_json={"questions": [1, 2]},
            status="suspected",
        )
        db.session.add(flag)
        db.session.commit()
        flag_id = flag.id

    # 1. Teacher views class error patterns
    resp = seeded_client.get("/api/teacher/classes/1/error-patterns", headers=teacher_headers)
    assert resp.status_code == 200
    patterns = resp.get_json()["data"]["error_patterns"]
    assert len(patterns) >= 1
    p = next(p for p in patterns if p["tag_id"] == 1)
    assert p["affected_students_count"] >= 1

    # 2. Teacher confirms the error pattern
    review_resp = seeded_client.post(
        f"/api/teacher/error-patterns/{flag_id}/review",
        headers=teacher_headers,
        json={"decision": "confirmed", "comments": "Confirmed via in-class diagnostic observation."},
    )
    assert review_resp.status_code == 200
    rev_data = review_resp.get_json()["data"]
    assert rev_data["decision"] == "confirmed"
    assert rev_data["status"] == "reviewed"

    # Verify audit in DB
    with seeded_client.application.app_context():
        review_record = ErrorPatternReview.query.filter_by(error_pattern_flag_id=flag_id).first()
        assert review_record is not None
        assert review_record.decision == "confirmed"

    # 3. Teacher dismisses another flag
    with seeded_client.application.app_context():
        flag2 = ErrorPatternFlag(
            student_id=4,
            topic_id=1,
            error_tag_id=2,
            evidence_count=2,
            incorrect_count=2,
            match_count=2,
            evidence_json={"questions": [3, 4]},
            status="suspected",
        )
        db.session.add(flag2)
        db.session.commit()
        flag2_id = flag2.id

    dismiss_resp = seeded_client.post(
        f"/api/teacher/error-patterns/{flag2_id}/review",
        headers=teacher_headers,
        json={"decision": "dismissed", "comments": "Careless calculation error, student self-corrected."},
    )
    assert dismiss_resp.status_code == 200
    assert dismiss_resp.get_json()["data"]["status"] == "dismissed"


# -------------------------------------------------------------
# 6. Teacher Intervention Lifecycle & Assignment
# -------------------------------------------------------------
def test_teacher_intervention_lifecycle(seeded_client):
    headers = _login(seeded_client, "teacher@learnloop.demo")

    # 1. Create manual intervention
    create_resp = seeded_client.post(
        "/api/teacher/interventions",
        headers=headers,
        json={
            "class_id": 1,
            "topic_id": 1,
            "title": "Fractions Visual Concept Intervention",
            "reason": "60% of students need denominator operation practice.",
            "recommended_action": "Use fraction strips and assign level 1 practice.",
        },
    )
    assert create_resp.status_code == 201
    inv_id = create_resp.get_json()["data"]["id"]

    # 2. Get details
    detail_resp = seeded_client.get(f"/api/teacher/interventions/{inv_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.get_json()["data"]["status"] == "suggested"

    # 3. Update intervention
    update_resp = seeded_client.patch(
        f"/api/teacher/interventions/{inv_id}",
        headers=headers,
        json={"title": "Updated Fractions Intervention", "status": "reviewed"},
    )
    assert update_resp.status_code == 200
    assert update_resp.get_json()["data"]["title"] == "Updated Fractions Intervention"
    assert update_resp.get_json()["data"]["status"] == "reviewed"

    # 4. Assign intervention to specific students [3, 4]
    assign_resp = seeded_client.post(
        f"/api/teacher/interventions/{inv_id}/assign",
        headers=headers,
        json={"student_ids": [3, 4]},
    )
    assert assign_resp.status_code == 200
    assigned_data = assign_resp.get_json()["data"]
    assert assigned_data["status"] == "assigned"
    assert len(assigned_data["assigned_students"]) == 2
    for s in assigned_data["assigned_students"]:
        assert s["status"] == "assigned"
        assert s["before_mastery"] is not None


# -------------------------------------------------------------
# 7. Intervention Completion, Learning Gain & Outcomes
# -------------------------------------------------------------
def test_intervention_completion_and_learning_gain(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # Student 3 (student.a) pre-test diagnostic attempt (percentage = 33.33)
    start_pre = seeded_client.post("/api/assessments/1/start", headers=student_headers)
    pre_attempt_id = start_pre.get_json()["data"]["attempt"]["attempt_id"]
    seeded_client.post(f"/api/attempts/{pre_attempt_id}/answers", headers=student_headers, json={"question_id": 1, "answer_text": "b"})
    seeded_client.post(f"/api/attempts/{pre_attempt_id}/submit", headers=student_headers)

    # Teacher creates and assigns an intervention
    with seeded_client.application.app_context():
        inv = Intervention(
            teacher_id=2,  # teacher.id
            class_id=1,
            subject_id=1,
            topic_id=1,
            title="Pre/Post Fractions Targeted Review",
            reason="Diagnostic pre-test indicates developing fractions foundation.",
            recommended_action="Review common denominators and re-test.",
            status="assigned",
        )
        db.session.add(inv)
        db.session.flush()

        ist = InterventionStudent(
            intervention_id=inv.id,
            student_id=3,
            before_mastery=30.0,
            status="assigned",
        )
        db.session.add(ist)
        db.session.commit()
        intervention_id = inv.id

    # Find reassessment assessment (assessment_type == 'reassessment', topic_id == 1)
    with seeded_client.application.app_context():
        reassess = Assessment.query.filter_by(topic_id=1, assessment_type="reassessment").first()
        assert reassess is not None
        reassess_id = reassess.id

    # Student takes reassessment and scores high (100%)
    start_post = seeded_client.post(f"/api/assessments/{reassess_id}/start", headers=student_headers)
    post_attempt_id = start_post.get_json()["data"]["attempt"]["attempt_id"]

    with seeded_client.application.app_context():
        questions = AssessmentQuestion.query.filter_by(assessment_id=reassess_id).all()
        for aq in questions:
            q = aq.question
            seeded_client.post(
                f"/api/attempts/{post_attempt_id}/answers",
                headers=student_headers,
                json={"question_id": q.id, "answer_text": q.correct_answer},
            )
    seeded_client.post(f"/api/attempts/{post_attempt_id}/submit", headers=student_headers)

    # Teacher completes intervention and triggers learning-gain calculation
    complete_resp = seeded_client.post(
        f"/api/teacher/interventions/{intervention_id}/complete",
        headers=teacher_headers,
        json={"reassessment_id": reassess_id},
    )
    assert complete_resp.status_code == 200
    comp_data = complete_resp.get_json()["data"]
    assert comp_data["status"] == "completed"
    assigned_stu = comp_data["assigned_students"][0]
    assert assigned_stu["status"] == "completed"
    assert assigned_stu["after_mastery"] > assigned_stu["before_mastery"]
    assert assigned_stu["outcome"] == "Strong improvement"

    # Verify LearningGainRecord
    with seeded_client.application.app_context():
        lgr = LearningGainRecord.query.filter_by(intervention_id=intervention_id, student_id=3).first()
        assert lgr is not None
        assert lgr.pre_score > 0
        assert lgr.post_score == 100.0
        assert lgr.score_gain > 0
        assert lgr.calculation_version == "hake-gain-v1"

    # Teacher fetches intervention outcome summary
    outcome_resp = seeded_client.get(
        f"/api/teacher/interventions/{intervention_id}/outcomes", headers=teacher_headers
    )
    assert outcome_resp.status_code == 200
    out_data = outcome_resp.get_json()["data"]
    assert out_data["intervention_id"] == intervention_id
    assert out_data["average_mastery_gain"] > 0
    assert out_data["outcome_distribution"]["Strong improvement"] == 1
