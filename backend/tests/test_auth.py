import pytest

from app.models.user import User
from app.seed.seed_data import seed_demo_data
from app.services.auth_service import clear_revoked_tokens
from app.utils.decorators import admin_required, student_required, teacher_required
from app.utils.responses import success_response


@pytest.fixture(autouse=True)
def clean_token_blocklist():
    clear_revoked_tokens()
    yield
    clear_revoked_tokens()


@pytest.fixture()
def seeded_client(app, client):
    with app.app_context():
        seed_demo_data("test-pilot-pass")

        # Register test routes to verify RBAC decorators
        @app.route("/test-rbac/admin-only", methods=["GET"])
        @admin_required
        def test_admin_route():
            return success_response(message="Admin access granted.")

        @app.route("/test-rbac/teacher-only", methods=["GET"])
        @teacher_required
        def test_teacher_route():
            return success_response(message="Teacher access granted.")

        @app.route("/test-rbac/student-only", methods=["GET"])
        @student_required
        def test_student_route():
            return success_response(message="Student access granted.")

    return client


def test_login_success_for_all_roles(seeded_client):
    roles_and_emails = [
        ("admin@learnloop.demo", "admin"),
        ("teacher@learnloop.demo", "teacher"),
        ("student.a@learnloop.demo", "student"),
    ]

    for email, expected_role in roles_and_emails:
        res = seeded_client.post(
            "/api/auth/login",
            json={"email": email, "password": "test-pilot-pass"},
        )
        assert res.status_code == 200
        json_data = res.get_json()
        assert json_data["success"] is True
        assert json_data["data"]["user"]["email"] == email
        assert json_data["data"]["user"]["role"] == expected_role
        assert "access_token" in json_data["data"]
        assert len(json_data["data"]["access_token"]) > 20


def test_login_with_incorrect_password(seeded_client):
    res = seeded_client.post(
        "/api/auth/login",
        json={"email": "student.a@learnloop.demo", "password": "wrong-password"},
    )
    assert res.status_code == 401
    json_data = res.get_json()
    assert json_data["success"] is False
    assert json_data["errors"][0]["code"] == "INVALID_CREDENTIALS"


def test_login_with_nonexistent_email(seeded_client):
    res = seeded_client.post(
        "/api/auth/login",
        json={"email": "nobody@learnloop.demo", "password": "test-pilot-pass"},
    )
    assert res.status_code == 401
    json_data = res.get_json()
    assert json_data["success"] is False
    assert json_data["errors"][0]["code"] == "INVALID_CREDENTIALS"


def test_login_with_inactive_user(app, seeded_client):
    with app.app_context():
        user = User.query.filter_by(email="student.a@learnloop.demo").first()
        assert user is not None
        user.is_active = False
        from app.extensions import db
        db.session.commit()

    res = seeded_client.post(
        "/api/auth/login",
        json={"email": "student.a@learnloop.demo", "password": "test-pilot-pass"},
    )
    assert res.status_code == 401
    json_data = res.get_json()
    assert json_data["success"] is False
    assert json_data["errors"][0]["code"] == "INVALID_CREDENTIALS"


def test_login_validation_missing_fields(seeded_client):
    res = seeded_client.post("/api/auth/login", json={})
    assert res.status_code == 400
    assert res.get_json()["errors"][0]["code"] == "VALIDATION_ERROR"

    res = seeded_client.post(
        "/api/auth/login",
        json={"email": "student.a@learnloop.demo"},
    )
    assert res.status_code == 400
    assert res.get_json()["errors"][0]["field"] == "password"


def test_get_profile_me_with_valid_token(seeded_client):
    login_res = seeded_client.post(
        "/api/auth/login",
        json={"email": "student.a@learnloop.demo", "password": "test-pilot-pass"},
    )
    token = login_res.get_json()["data"]["access_token"]

    res = seeded_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["email"] == "student.a@learnloop.demo"
    assert json_data["data"]["role"] == "student"
    assert len(json_data["data"]["enrolled_classes"]) >= 1


def test_get_profile_me_unauthorized_and_invalid_token(seeded_client):
    # Missing token
    res = seeded_client.get("/api/auth/me")
    assert res.status_code == 401
    json_data = res.get_json()
    assert json_data["success"] is False
    assert json_data["errors"][0]["code"] == "AUTHORIZATION_REQUIRED"

    # Malformed token
    res = seeded_client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer malformed-token-xyz"},
    )
    assert res.status_code == 401
    json_data = res.get_json()
    assert json_data["success"] is False
    assert json_data["errors"][0]["code"] == "INVALID_TOKEN"


def test_logout_revokes_token(seeded_client):
    login_res = seeded_client.post(
        "/api/auth/login",
        json={"email": "teacher@learnloop.demo", "password": "test-pilot-pass"},
    )
    token = login_res.get_json()["data"]["access_token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    # Verify profile works before logout
    me_res = seeded_client.get("/api/auth/me", headers=auth_header)
    assert me_res.status_code == 200

    # Logout
    logout_res = seeded_client.post("/api/auth/logout", headers=auth_header)
    assert logout_res.status_code == 200
    assert logout_res.get_json()["data"]["revoked"] is True

    # Subsequent request using the revoked token must be rejected
    rejected_res = seeded_client.get("/api/auth/me", headers=auth_header)
    assert rejected_res.status_code == 401
    json_data = rejected_res.get_json()
    assert json_data["success"] is False
    assert json_data["errors"][0]["code"] == "TOKEN_REVOKED"


def test_role_based_access_control_guards(seeded_client):
    # Log in as student
    student_token = seeded_client.post(
        "/api/auth/login",
        json={"email": "student.a@learnloop.demo", "password": "test-pilot-pass"},
    ).get_json()["data"]["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Student accessing student route: allowed
    res = seeded_client.get("/test-rbac/student-only", headers=student_headers)
    assert res.status_code == 200

    # Student accessing teacher route: forbidden (403)
    res = seeded_client.get("/test-rbac/teacher-only", headers=student_headers)
    assert res.status_code == 403
    assert res.get_json()["errors"][0]["code"] == "FORBIDDEN"

    # Student accessing admin route: forbidden (403)
    res = seeded_client.get("/test-rbac/admin-only", headers=student_headers)
    assert res.status_code == 403
    assert res.get_json()["errors"][0]["code"] == "FORBIDDEN"

    # Log in as teacher
    teacher_token = seeded_client.post(
        "/api/auth/login",
        json={"email": "teacher@learnloop.demo", "password": "test-pilot-pass"},
    ).get_json()["data"]["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Teacher accessing teacher route: allowed
    res = seeded_client.get("/test-rbac/teacher-only", headers=teacher_headers)
    assert res.status_code == 200

    # Teacher accessing admin route: forbidden (403)
    res = seeded_client.get("/test-rbac/admin-only", headers=teacher_headers)
    assert res.status_code == 403
    assert res.get_json()["errors"][0]["code"] == "FORBIDDEN"

    # Log in as admin
    admin_token = seeded_client.post(
        "/api/auth/login",
        json={"email": "admin@learnloop.demo", "password": "test-pilot-pass"},
    ).get_json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin accessing admin route: allowed
    res = seeded_client.get("/test-rbac/admin-only", headers=admin_headers)
    assert res.status_code == 200

    # Admin accessing teacher route: allowed
    res = seeded_client.get("/test-rbac/teacher-only", headers=admin_headers)
    assert res.status_code == 200
