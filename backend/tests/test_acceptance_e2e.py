import pytest

from app.models.academic import Topic
from app.models.assessment import Assessment, AssessmentQuestion, Attempt
from app.models.governance import LearningGainRecord, Report
from app.models.intervention import Intervention
from app.models.mastery import ErrorPatternFlag, MasteryRecord, Recommendation
from app.models.user import User
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


# ---------------------------------------------------------------------------
# Complete End-to-End Acceptance Test: The Closed-Loop Learning Intelligence
# Assess -> Diagnose -> Recommend -> Practice -> Reassess -> Measure -> Guide -> Report
# ---------------------------------------------------------------------------
def test_full_closed_loop_pilot_acceptance(seeded_client):
    admin_headers = _login(seeded_client, "admin@learnloop.demo")
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_a_headers = _login(seeded_client, "student.a@learnloop.demo")
    student_b_headers = _login(seeded_client, "student.b@learnloop.demo")

    with seeded_client.application.app_context():
        student_a = User.query.filter_by(email="student.a@learnloop.demo").first()
        student_a_id = student_a.id
        fractions_topic = Topic.query.filter_by(title="Fractions").first()
        fractions_id = fractions_topic.id

    # =========================================================================
    # STEP 1: Student Baseline
    # =========================================================================
    dash_resp = seeded_client.get("/api/student/dashboard", headers=student_a_headers)
    assert dash_resp.status_code == 200
    dash_body = dash_resp.get_json()["data"]
    assert dash_body["student_id"] == student_a_id
    assert len(dash_body["recent_attempts"]) == 0

    # =========================================================================
    # STEP 2: Diagnostic Pre-Test with Weak Fractions Answers
    # =========================================================================
    # 2.1 Find Diagnostic assessment
    assessments_resp = seeded_client.get("/api/assessments?class_id=1", headers=student_a_headers)
    assert assessments_resp.status_code == 200
    assessments = assessments_resp.get_json()["data"]["assessments"]
    diagnostic = next(a for a in assessments if a["assessment_type"] == "diagnostic")
    diag_id = diagnostic["id"]

    # 2.2 Start Diagnostic attempt
    start_resp = seeded_client.post(f"/api/assessments/{diag_id}/start", headers=student_a_headers)
    assert start_resp.status_code == 200
    attempt_id = start_resp.get_json()["data"]["attempt"]["attempt_id"]

    # 2.3 Answer Fractions questions with option "a" (misconception distractor)
    with seeded_client.application.app_context():
        diag_assessment = Assessment.query.get(diag_id)
        frac_qids = [
            aq.question_id
            for aq in diag_assessment.questions
            if aq.question.topic_id == fractions_id
        ]
        non_frac_qids = [
            aq.question_id
            for aq in diag_assessment.questions
            if aq.question.topic_id != fractions_id
        ]

    # Submit misconception choice "a" for Fractions (at least 2 questions)
    for qid in frac_qids:
        save_resp = seeded_client.post(
            f"/api/attempts/{attempt_id}/answers",
            json={"question_id": qid, "answer_text": "a", "time_spent_seconds": 25},
            headers=student_a_headers,
        )
        assert save_resp.status_code == 200

    # Submit correct choice "b" for non-Fractions
    for qid in non_frac_qids:
        seeded_client.post(
            f"/api/attempts/{attempt_id}/answers",
            json={"question_id": qid, "answer_text": "b", "time_spent_seconds": 20},
            headers=student_a_headers,
        )

    # 2.4 Finalize submission
    submit_resp = seeded_client.post(
        f"/api/attempts/{attempt_id}/submit",
        headers=student_a_headers,
    )
    assert submit_resp.status_code == 200
    diag_result = submit_resp.get_json()["data"]["result"]
    assert diag_result["status"] == "scored"
    diag_percentage = diag_result["percentage"]

    # =========================================================================
    # STEP 3: Automated Learning Intelligence Verification
    # =========================================================================
    with seeded_client.application.app_context():
        # Verify Fractions topic mastery is low
        frac_mastery = (
            MasteryRecord.query.filter_by(student_id=student_a_id, topic_id=fractions_id)
            .order_by(MasteryRecord.calculated_at.desc())
            .first()
        )
        assert frac_mastery is not None
        assert frac_mastery.mastery_score < 40.0

        # Verify recurrent misconception was detected
        flag = ErrorPatternFlag.query.filter_by(
            student_id=student_a_id, topic_id=fractions_id
        ).first()
        assert flag is not None
        assert flag.match_count >= 2
        flag_id = flag.id

        # Verify recommendation generated
        rec = (
            Recommendation.query.filter_by(student_id=student_a_id, topic_id=fractions_id)
            .filter(Recommendation.status.in_(["generated", "viewed", "in_progress"]))
            .first()
        )
        assert rec is not None
        rec_id = rec.id
        action_ids = [a.id for a in rec.actions]

    # =========================================================================
    # STEP 4: Teacher Intelligence & Intervention Assignment
    # =========================================================================
    # 4.1 Teacher inspects Class Dashboard and sees alerts
    t_dash = seeded_client.get("/api/teacher/classes/1/dashboard", headers=teacher_headers)
    assert t_dash.status_code == 200
    assert t_dash.get_json()["data"]["active_error_flags_count"] >= 1

    # 4.2 Teacher reviews error patterns
    err_patterns = seeded_client.get("/api/teacher/classes/1/error-patterns", headers=teacher_headers)
    assert err_patterns.status_code == 200
    patterns_data = err_patterns.get_json()["data"]
    assert len(patterns_data["error_patterns"]) >= 1

    # 4.3 Teacher reviews and confirms the misconception flag
    rev_resp = seeded_client.post(
        f"/api/teacher/error-patterns/{flag_id}/review",
        json={"decision": "confirmed", "comments": "Confirmed recurring misconception on Fractions."},
        headers=teacher_headers,
    )
    assert rev_resp.status_code == 200
    assert rev_resp.get_json()["data"]["decision"] == "confirmed"

    # 4.4 Teacher creates and assigns an intervention
    create_inv = seeded_client.post(
        "/api/teacher/interventions",
        json={
            "class_id": 1,
            "topic_id": fractions_id,
            "title": "Fractions Conceptual Remediation",
            "reason": "Class diagnostic revealed denominator operation errors.",
            "recommended_action": "Small group guided review of common denominators.",
        },
        headers=teacher_headers,
    )
    assert create_inv.status_code == 201
    inv_id = create_inv.get_json()["data"]["id"]

    assign_inv = seeded_client.post(
        f"/api/teacher/interventions/{inv_id}/assign",
        json={"student_ids": [student_a_id]},
        headers=teacher_headers,
    )
    assert assign_inv.status_code == 200

    # =========================================================================
    # STEP 5: Student Targeted Practice
    # =========================================================================
    # 5.1 Student marks recommended action as completed
    if action_ids:
        act_resp = seeded_client.post(
            f"/api/student/actions/{action_ids[0]}/complete",
            headers=student_a_headers,
        )
        assert act_resp.status_code == 200

    # 5.2 Student completes Fractions Level 1 practice
    practice_assessment = next(
        a for a in assessments if a["assessment_type"] == "practice" and a["topic_id"] == fractions_id
    )
    prac_start = seeded_client.post(
        f"/api/assessments/{practice_assessment['id']}/start",
        headers=student_a_headers,
    )
    assert prac_start.status_code == 200
    prac_attempt_id = prac_start.get_json()["data"]["attempt"]["attempt_id"]

    with seeded_client.application.app_context():
        p_obj = Assessment.query.get(practice_assessment["id"])
        prac_qids = [aq.question_id for aq in p_obj.questions]

    # Student answers practice with correct choice "b"
    for qid in prac_qids:
        seeded_client.post(
            f"/api/attempts/{prac_attempt_id}/answers",
            json={"question_id": qid, "answer_text": "b", "time_spent_seconds": 15},
            headers=student_a_headers,
        )

    prac_submit = seeded_client.post(
        f"/api/attempts/{prac_attempt_id}/submit",
        headers=student_a_headers,
    )
    assert prac_submit.status_code == 200
    assert prac_submit.get_json()["data"]["result"]["percentage"] == 100.0

    # =========================================================================
    # STEP 6: Reassessment Post-Test & Learning Gain Measurement
    # =========================================================================
    reassess_assessment = next(
        a for a in assessments if a["assessment_type"] == "reassessment" and a["topic_id"] == fractions_id
    )
    reassess_id = reassess_assessment["id"]
    reassess_start = seeded_client.post(
        f"/api/assessments/{reassess_id}/start",
        headers=student_a_headers,
    )
    assert reassess_start.status_code == 200
    reassess_attempt_id = reassess_start.get_json()["data"]["attempt"]["attempt_id"]

    with seeded_client.application.app_context():
        r_obj = Assessment.query.get(reassess_id)
        reassess_qids = [aq.question_id for aq in r_obj.questions]

    for qid in reassess_qids:
        seeded_client.post(
            f"/api/attempts/{reassess_attempt_id}/answers",
            json={"question_id": qid, "answer_text": "b", "time_spent_seconds": 18},
            headers=student_a_headers,
        )

    reassess_submit = seeded_client.post(
        f"/api/attempts/{reassess_attempt_id}/submit",
        headers=student_a_headers,
    )
    assert reassess_submit.status_code == 200
    assert reassess_submit.get_json()["data"]["result"]["percentage"] == 100.0

    # 6.2 Teacher marks intervention completed with reassessment linking
    complete_inv = seeded_client.post(
        f"/api/teacher/interventions/{inv_id}/complete",
        json={"reassessment_id": reassess_id},
        headers=teacher_headers,
    )
    assert complete_inv.status_code == 200
    inv_details = complete_inv.get_json()["data"]
    assert inv_details["status"] == "completed"

    # Verify Hake's normalized learning gain was computed and logged
    with seeded_client.application.app_context():
        gain_rec = LearningGainRecord.query.filter_by(
            student_id=student_a_id, topic_id=fractions_id
        ).order_by(LearningGainRecord.calculated_at.desc()).first()
        assert gain_rec is not None
        assert gain_rec.score_gain > 0
        assert gain_rec.after_mastery > gain_rec.before_mastery

    # =========================================================================
    # STEP 7: Report Retrieval & Access Governance
    # =========================================================================
    # 7.1 Teacher generates student report
    rep_gen = seeded_client.post(
        f"/api/reports/student/{student_a_id}/generate",
        json={"subject_id": 1, "term_label": "Final Term"},
        headers=teacher_headers,
    )
    assert rep_gen.status_code == 201, f"Failed with {rep_gen.status_code}: {rep_gen.get_json()}"

    # 7.2 Student A retrieves their own report card
    stud_rep = seeded_client.get(
        "/api/student/reports/Final Term?subject_id=1",
        headers=student_a_headers,
    )
    assert stud_rep.status_code == 200
    rep_payload = stud_rep.get_json()["data"]["payload"]

    # Verify Traditional report contents
    trad = rep_payload["traditional_report"]
    assert trad["total_assessments_completed"] >= 3
    assert "overall_accuracy_percentage" in trad

    # Verify Analytics report contents
    analytics = rep_payload["analytics_report"]
    assert len(analytics["learning_gains"]) >= 1
    assert "explainable_mastery_formula" in analytics

    # 7.3 Student B cannot access Student A's report
    forbidden_resp = seeded_client.get(
        f"/api/reports/student/{student_a_id}/Final Term?subject_id=1",
        headers=student_b_headers,
    )
    assert forbidden_resp.status_code == 403

    # 7.4 Admin checks audit logs to verify immutable governance trail
    audit_resp = seeded_client.get("/api/admin/audit-logs", headers=admin_headers)
    assert audit_resp.status_code == 200
    all_actions = [log["action"] for log in audit_resp.get_json()["data"]["audit_logs"]]
    assert "assessment.submit" in all_actions
    assert "teacher.error_pattern_review" in all_actions
    assert "intervention.assign" in all_actions
    assert "intervention.complete" in all_actions
    assert "report.generate" in all_actions
