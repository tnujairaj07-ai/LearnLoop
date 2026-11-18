"""Tests for Phase B: rich demo account seeding, public user registration, and per-account isolation."""

from app.models import (
    Achievement,
    Attempt,
    AttendanceRecord,
    ClassAnnouncement,
    ClassEvent,
    Enrollment,
    ErrorPatternFlag,
    MasteryRecord,
    Recommendation,
    Report,
    ResourceView,
    StudentAchievement,
    StudentDailyActivity,
    StudentReminder,
    StudentTask,
    StudySession,
    Subject,
    SubjectBookmark,
    TeacherFeedback,
    Topic,
    User,
)
from app.seed.rich_demo_seed import seed_rich_demo_accounts
from app.seed.seed_data import seed_demo_data

DEMO_PASSWORD = "demo1234"


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_rich_demo_seed_populates_accounts_and_engagement_tables(app, client):
    with app.app_context():
        summary = seed_rich_demo_accounts()
        assert set(summary["demo_users"]) == {
            "admin@demo.com",
            "teacher@demo.com",
            "student@demo.com",
        }
        assert summary["classmates"] == 10
        assert summary["subjects"] >= 12
        assert summary["math_topics"] >= 16
        assert summary["achievements_awarded"] == 5
        assert summary["daily_activity_days"] >= 84
        assert summary["study_sessions"] >= 10

        demo_student = User.query.filter_by(email="student@demo.com").first()
        demo_teacher = User.query.filter_by(email="teacher@demo.com").first()
        demo_admin = User.query.filter_by(email="admin@demo.com").first()
        assert demo_student is not None and demo_student.is_active is True
        assert demo_teacher is not None and demo_teacher.is_active is True
        assert demo_admin is not None and demo_admin.is_active is True

        assert Attempt.query.filter_by(student_id=demo_student.id).count() >= 7
        assert MasteryRecord.query.filter_by(student_id=demo_student.id).count() >= 8
        assert StudentDailyActivity.query.filter_by(student_id=demo_student.id).count() >= 84
        assert StudySession.query.filter_by(user_id=demo_student.id).count() >= 10
        assert Achievement.query.count() == 5
        assert StudentAchievement.query.filter_by(student_id=demo_student.id).count() == 5
        assert TeacherFeedback.query.filter_by(student_id=demo_student.id).count() >= 2
        assert ClassEvent.query.count() >= 4
        assert ClassAnnouncement.query.count() >= 1
        assert AttendanceRecord.query.filter_by(student_id=demo_student.id).count() >= 20
        assert StudentTask.query.filter_by(student_id=demo_student.id).count() >= 4
        assert StudentReminder.query.filter_by(recipient_user_id=demo_student.id).count() >= 1
        assert SubjectBookmark.query.filter_by(user_id=demo_student.id).count() >= 2
        assert Report.query.filter_by(student_id=demo_student.id).count() >= 2

    for email, expected_role in (
        ("student@demo.com", "student"),
        ("teacher@demo.com", "teacher"),
        ("admin@demo.com", "admin"),
    ):
        resp = client.post("/api/auth/login", json={"email": email, "password": DEMO_PASSWORD})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert body["data"]["user"]["role"] == expected_role
        assert body["data"]["access_token"]


def test_rich_demo_seed_is_idempotent(app):
    with app.app_context():
        seed_rich_demo_accounts()
        first_counts = (
            User.query.count(),
            Subject.query.count(),
            Topic.query.count(),
            Achievement.query.count(),
            StudentAchievement.query.count(),
            StudentDailyActivity.query.count(),
            StudySession.query.count(),
            TeacherFeedback.query.count(),
            ClassEvent.query.count(),
            ClassAnnouncement.query.count(),
            Report.query.count(),
            Attempt.query.count(),
            MasteryRecord.query.count(),
        )

        seed_rich_demo_accounts()
        second_counts = (
            User.query.count(),
            Subject.query.count(),
            Topic.query.count(),
            Achievement.query.count(),
            StudentAchievement.query.count(),
            StudentDailyActivity.query.count(),
            StudySession.query.count(),
            TeacherFeedback.query.count(),
            ClassEvent.query.count(),
            ClassAnnouncement.query.count(),
            Report.query.count(),
            Attempt.query.count(),
            MasteryRecord.query.count(),
        )

        assert second_counts == first_counts


def test_register_student_starts_at_zero_and_shares_common_curriculum(app, client):
    with app.app_context():
        seed_rich_demo_accounts()

    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Fresh Learner",
            "email": "fresh.student@example.com",
            "password": "password123",
            "role": "student",
            "grade": "Grade 9",
        },
    )
    assert reg_resp.status_code == 201
    reg_body = reg_resp.get_json()
    assert reg_body["success"] is True
    token = reg_body["data"]["access_token"]
    new_user = reg_body["data"]["user"]
    assert new_user["role"] == "student"
    assert new_user["class_name"] == "Class 9-A"
    new_student_id = new_user["id"]

    # Common read-only curriculum is shared
    subjects_resp = client.get("/api/content/subjects", headers=_auth_header(token))
    assert subjects_resp.status_code == 200
    subjects = subjects_resp.get_json()["data"]["subjects"]
    assert len(subjects) >= 12

    # Personal dashboard starts strictly from zero
    dash_resp = client.get("/api/student/dashboard", headers=_auth_header(token))
    assert dash_resp.status_code == 200
    dash = dash_resp.get_json()["data"]
    assert dash["overall_mastery"] == 0.0
    assert dash["recommendations"] == []
    assert dash["recent_attempts"] == []
    assert dash["active_flags_count"] == 0
    assert len(dash["topic_summaries"]) >= 16
    assert all(t["mastery_score"] == 0.0 for t in dash["topic_summaries"])
    assert all(t["evidence_count"] == 0 for t in dash["topic_summaries"])

    # Every personal table is empty for the new student
    with app.app_context():
        assert Attempt.query.filter_by(student_id=new_student_id).count() == 0
        assert MasteryRecord.query.filter_by(student_id=new_student_id).count() == 0
        assert StudentDailyActivity.query.filter_by(student_id=new_student_id).count() == 0
        assert StudySession.query.filter_by(user_id=new_student_id).count() == 0
        assert StudentAchievement.query.filter_by(student_id=new_student_id).count() == 0
        assert TeacherFeedback.query.filter_by(student_id=new_student_id).count() == 0
        assert StudentTask.query.filter_by(student_id=new_student_id).count() == 0
        assert StudentReminder.query.filter_by(recipient_user_id=new_student_id).count() == 0
        assert AttendanceRecord.query.filter_by(student_id=new_student_id).count() == 0
        assert ErrorPatternFlag.query.filter_by(student_id=new_student_id).count() == 0
        assert Recommendation.query.filter_by(student_id=new_student_id).count() == 0
        assert SubjectBookmark.query.filter_by(user_id=new_student_id).count() == 0
        assert ResourceView.query.filter_by(student_id=new_student_id).count() == 0
        assert Report.query.filter_by(student_id=new_student_id).count() == 0


def test_demo_vs_registered_student_isolation(app, client):
    with app.app_context():
        seed_rich_demo_accounts()
        demo_student_id = User.query.filter_by(email="student@demo.com").first().id

    demo_login = client.post(
        "/api/auth/login", json={"email": "student@demo.com", "password": DEMO_PASSWORD}
    )
    assert demo_login.status_code == 200
    demo_token = demo_login.get_json()["data"]["access_token"]

    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Isolated Student",
            "email": "isolated.student@example.com",
            "password": "password123",
        },
    )
    assert reg_resp.status_code == 201
    new_token = reg_resp.get_json()["data"]["access_token"]

    demo_dash = client.get("/api/student/dashboard", headers=_auth_header(demo_token)).get_json()["data"]
    new_dash = client.get("/api/student/dashboard", headers=_auth_header(new_token)).get_json()["data"]

    assert demo_dash["overall_mastery"] > 0
    assert len(demo_dash["recent_attempts"]) > 0
    assert any(t["evidence_count"] > 0 for t in demo_dash["topic_summaries"])

    assert new_dash["overall_mastery"] == 0.0
    assert new_dash["recent_attempts"] == []
    assert all(t["evidence_count"] == 0 for t in new_dash["topic_summaries"])

    # Demo student reads own report; newly registered student is blocked from demo student's report
    own_report = client.get(
        f"/api/reports/student/{demo_student_id}/Term 1", headers=_auth_header(demo_token)
    )
    assert own_report.status_code == 200

    forbidden_report = client.get(
        f"/api/reports/student/{demo_student_id}/Term 1", headers=_auth_header(new_token)
    )
    assert forbidden_report.status_code == 403


def test_register_teacher_and_validation_guards(app, client):
    with app.app_context():
        seed_rich_demo_accounts()

    # Teacher registration succeeds
    teacher_resp = client.post(
        "/api/auth/register",
        json={
            "name": "New Educator",
            "email": "new.teacher@example.com",
            "password": "password123",
            "role": "teacher",
        },
    )
    assert teacher_resp.status_code == 201
    teacher_data = teacher_resp.get_json()["data"]
    assert teacher_data["user"]["role"] == "teacher"
    assert teacher_data["user"]["class_name"] is None
    assert teacher_data["access_token"]

    # Duplicate email fails with 409
    dup_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Duplicate",
            "email": "NEW.TEACHER@example.com",
            "password": "password123",
        },
    )
    assert dup_resp.status_code == 409

    # Self-registering as admin is forbidden
    admin_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Admin Attempt",
            "email": "bad.admin@example.com",
            "password": "password123",
            "role": "admin",
        },
    )
    assert admin_resp.status_code == 403

    # Validation checks
    short_pw = client.post(
        "/api/auth/register",
        json={"name": "A", "email": "a@example.com", "password": "123"},
    )
    assert short_pw.status_code == 400

    bad_email = client.post(
        "/api/auth/register",
        json={"name": "User", "email": "not-an-email", "password": "password123"},
    )
    assert bad_email.status_code == 400

    missing_class = client.post(
        "/api/auth/register",
        json={
            "name": "No Class",
            "email": "noclass@example.com",
            "password": "password123",
            "class_id": 999999,
        },
    )
    assert missing_class.status_code == 404


def test_synthetic_seed_and_rich_demo_coexist(app):
    with app.app_context():
        seed_demo_data("PilotPass123!")
        seed_rich_demo_accounts()
        synthetic_users = User.query.filter_by(data_source="synthetic_demo").count()
        synthetic_enrollments = (
            Enrollment.query.join(User, Enrollment.student_id == User.id)
            .filter(User.data_source == "synthetic_demo")
            .count()
        )
        assert synthetic_users == 22
        assert synthetic_enrollments == 20
        assert User.query.filter_by(email="student@demo.com").first() is not None
