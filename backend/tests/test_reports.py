from datetime import datetime

import pytest

from app.extensions import db
from app.models.governance import AuditLog, Report
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


# -------------------------------------------------------------
# 1. Student Report Generation and Retrieval
# -------------------------------------------------------------
def test_generate_and_get_student_report(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    with seeded_client.application.app_context():
        student_a = User.query.filter_by(email="student.a@learnloop.demo").first()
        student_id = student_a.id

    # 1. Teacher generates student report
    gen_resp = seeded_client.post(
        f"/api/reports/student/{student_id}/generate",
        json={"subject_id": 1, "term_label": "Term 1", "report_type": "student"},
        headers=teacher_headers,
    )
    assert gen_resp.status_code == 201
    gen_body = gen_resp.get_json()
    assert gen_body["success"] is True
    data = gen_body["data"]
    assert data["student_id"] == student_id
    assert data["term_label"] == "Term 1"
    assert data["report_type"] == "student"

    payload = data["payload"]
    assert "student_profile" in payload
    assert payload["student_profile"]["name"] == "Student A"
    assert "traditional_report" in payload
    assert "analytics_report" in payload

    trad = payload["traditional_report"]
    assert "overall_accuracy_percentage" in trad
    assert "overall_mastery_score" in trad
    assert "overall_mastery_band" in trad
    assert "topic_grades" in trad
    assert len(trad["topic_grades"]) == 5  # 5 pilot topics

    analytics = payload["analytics_report"]
    assert "topic_mastery_decomposition" in analytics
    assert "explainable_mastery_formula" in analytics

    # 2. Student retrieves their own report via reports API
    get_resp = seeded_client.get(
        f"/api/reports/student/{student_id}/Term 1?subject_id=1",
        headers=student_headers,
    )
    assert get_resp.status_code == 200
    get_body = get_resp.get_json()
    assert get_body["success"] is True
    assert get_body["data"]["payload"]["student_profile"]["student_id"] == student_id

    # 3. Student retrieves report via convenience route /api/student/reports/Term 1
    conv_resp = seeded_client.get(
        "/api/student/reports/Term 1?subject_id=1",
        headers=student_headers,
    )
    assert conv_resp.status_code == 200
    conv_body = conv_resp.get_json()
    assert conv_body["success"] is True
    assert conv_body["data"]["payload"]["student_profile"]["student_id"] == student_id


# -------------------------------------------------------------
# 2. Student Report RBAC and Cross-Student Isolation
# -------------------------------------------------------------
def test_student_report_rbac_and_isolation(seeded_client):
    student_a_headers = _login(seeded_client, "student.a@learnloop.demo")
    student_b_headers = _login(seeded_client, "student.b@learnloop.demo")

    with seeded_client.application.app_context():
        student_b = User.query.filter_by(email="student.b@learnloop.demo").first()
        student_b_id = student_b.id

    # Student A cannot view Student B's report
    resp = seeded_client.get(
        f"/api/reports/student/{student_b_id}/Term 1?subject_id=1",
        headers=student_a_headers,
    )
    assert resp.status_code == 403
    body = resp.get_json()
    assert body["success"] is False
    assert "only view their own reports" in body["message"]

    # Student A cannot generate Student B's report
    gen_resp = seeded_client.post(
        f"/api/reports/student/{student_b_id}/generate",
        json={"subject_id": 1, "term_label": "Term 1"},
        headers=student_a_headers,
    )
    assert gen_resp.status_code == 403


# -------------------------------------------------------------
# 3. Class Report Generation and Scoping
# -------------------------------------------------------------
def test_generate_and_get_class_report(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_headers = _login(seeded_client, "student.a@learnloop.demo")

    # 1. Student cannot generate or view class report
    resp = seeded_client.post(
        "/api/reports/class/1/generate",
        json={"subject_id": 1, "term_label": "Term 1"},
        headers=student_headers,
    )
    assert resp.status_code == 403

    resp = seeded_client.get(
        "/api/reports/class/1/1/Term 1",
        headers=student_headers,
    )
    assert resp.status_code == 403

    # 2. Teacher generates class report
    gen_resp = seeded_client.post(
        "/api/reports/class/1/generate",
        json={"subject_id": 1, "term_label": "Term 1"},
        headers=teacher_headers,
    )
    assert gen_resp.status_code == 201
    gen_body = gen_resp.get_json()
    assert gen_body["success"] is True
    data = gen_body["data"]
    assert data["class_id"] == 1
    assert data["subject_id"] == 1
    assert data["term_label"] == "Term 1"

    payload = data["payload"]
    assert "class_profile" in payload
    assert payload["class_profile"]["name"] == "Class 9-A"
    assert payload["class_profile"]["total_students"] == 20
    assert "class_summary" in payload
    assert "curriculum_heatmap" in payload
    assert len(payload["curriculum_heatmap"]) == 5
    assert "student_roster_diagnostic" in payload
    assert len(payload["student_roster_diagnostic"]) == 20

    # 3. Teacher retrieves class report
    get_resp = seeded_client.get(
        "/api/reports/class/1/1/Term 1",
        headers=teacher_headers,
    )
    assert get_resp.status_code == 200
    get_body = get_resp.get_json()
    assert get_body["success"] is True

    # 4. Teacher accessing an unassigned class (e.g. 999) receives 403 Forbidden
    unassigned_resp = seeded_client.get(
        "/api/reports/class/999/1/Term 1",
        headers=teacher_headers,
    )
    assert unassigned_resp.status_code == 403


# -------------------------------------------------------------
# 4. Report Retrieval by ID
# -------------------------------------------------------------
def test_get_report_by_id_and_scoping(seeded_client):
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")
    student_a_headers = _login(seeded_client, "student.a@learnloop.demo")
    student_b_headers = _login(seeded_client, "student.b@learnloop.demo")

    with seeded_client.application.app_context():
        student_a = User.query.filter_by(email="student.a@learnloop.demo").first()
        student_a_id = student_a.id

    # Generate student A report
    gen_resp = seeded_client.post(
        f"/api/reports/student/{student_a_id}/generate",
        json={"subject_id": 1, "term_label": "Term 1"},
        headers=teacher_headers,
    )
    assert gen_resp.status_code == 201
    report_id = gen_resp.get_json()["data"]["report_id"]

    # Student A can retrieve own report by ID
    resp = seeded_client.get(f"/api/reports/{report_id}", headers=student_a_headers)
    assert resp.status_code == 200
    assert resp.get_json()["data"]["report_id"] == report_id

    # Student B cannot retrieve student A's report by ID
    resp_b = seeded_client.get(f"/api/reports/{report_id}", headers=student_b_headers)
    assert resp_b.status_code == 403

    # Teacher assigned to student A's class can retrieve it
    resp_t = seeded_client.get(f"/api/reports/{report_id}", headers=teacher_headers)
    assert resp_t.status_code == 200


# -------------------------------------------------------------
# 5. Immutable Audit Logging and Governance Inspection
# -------------------------------------------------------------
def test_audit_logging_and_admin_inspection(seeded_client):
    admin_headers = _login(seeded_client, "admin@learnloop.demo")
    teacher_headers = _login(seeded_client, "teacher@learnloop.demo")

    # 1. Non-admin cannot access audit logs
    resp = seeded_client.get("/api/admin/audit-logs", headers=teacher_headers)
    assert resp.status_code == 403

    # 2. Trigger report generation to ensure audit log entry
    seeded_client.post(
        "/api/reports/class/1/generate",
        json={"subject_id": 1, "term_label": "AuditTerm"},
        headers=teacher_headers,
    )

    # 3. Admin queries audit logs
    admin_resp = seeded_client.get("/api/admin/audit-logs", headers=admin_headers)
    assert admin_resp.status_code == 200
    body = admin_resp.get_json()
    assert body["success"] is True
    data = body["data"]
    assert "audit_logs" in data
    assert data["total_count"] > 0

    actions = [log["action"] for log in data["audit_logs"]]
    assert any("report.generate" in a for a in actions)

    # 4. Filter by action
    filtered_resp = seeded_client.get(
        "/api/admin/audit-logs?action=report.generate",
        headers=admin_headers,
    )
    assert filtered_resp.status_code == 200
    filtered_data = filtered_resp.get_json()["data"]
    for log in filtered_data["audit_logs"]:
        assert "report.generate" in log["action"]


# -------------------------------------------------------------
# 6. Privacy Purge & Student Anonymization
# -------------------------------------------------------------
def test_privacy_purge_anonymization(seeded_client):
    admin_headers = _login(seeded_client, "admin@learnloop.demo")
    student_headers = _login(seeded_client, "student.b@learnloop.demo")

    with seeded_client.application.app_context():
        student_b = User.query.filter_by(email="student.b@learnloop.demo").first()
        student_b_id = student_b.id

    # 1. Non-admin cannot purge user
    purge_resp = seeded_client.delete(
        f"/api/admin/users/{student_b_id}/privacy-purge",
        headers=student_headers,
    )
    assert purge_resp.status_code == 403

    # 2. Admin performs privacy purge
    admin_purge = seeded_client.delete(
        f"/api/admin/users/{student_b_id}/privacy-purge",
        headers=admin_headers,
    )
    assert admin_purge.status_code == 200
    assert admin_purge.get_json()["success"] is True

    # 3. Verify user record is anonymized in database
    with seeded_client.application.app_context():
        user = User.query.get(student_b_id)
        assert user.name == f"Learner_{student_b_id}"
        assert user.email == f"anonymized_{student_b_id}@learnloop.local"
        assert user.is_active is False

        # Verify audit log entry exists
        audit = AuditLog.query.filter_by(action="privacy.purge", entity_id=str(student_b_id)).first()
        assert audit is not None
