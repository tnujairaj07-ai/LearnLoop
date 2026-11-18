"""Integration and security tests for Phase C live portal APIs (Student, Teacher, Content, Reports, Admin)."""

from app.extensions import db
from app.models import Class, Question, Resource, Role, Subject, Topic, User
from app.seed.rich_demo_seed import seed_rich_demo_accounts
from werkzeug.security import generate_password_hash


DEMO_PASSWORD = "demo1234"


def _login(client, email, password=DEMO_PASSWORD):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["data"]["access_token"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_student_portal_demo_vs_zero_state_isolation(app, client):
    with app.app_context():
        seed_rich_demo_accounts()
        math_subj = Subject.query.filter_by(code="MATH-9-UI").first()
        assert math_subj is not None
        math_id = math_subj.id
        first_topic_id = Topic.query.filter_by(subject_id=math_id).order_by(Topic.order_index.asc()).first().id

    demo_token = _login(client, "student@demo.com")

    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Zero Student",
            "email": "zero.phasec@example.com",
            "password": "password123",
            "grade": "Grade 9",
        },
    )
    assert reg_resp.status_code == 201
    new_token = reg_resp.get_json()["data"]["access_token"]

    # 1. Enriched Dashboard
    demo_dash = client.get("/api/student/dashboard", headers=_headers(demo_token)).get_json()["data"]
    new_dash = client.get("/api/student/dashboard", headers=_headers(new_token)).get_json()["data"]

    assert demo_dash["overview_stats"]["assessments_completed"] >= 7
    assert demo_dash["overview_stats"]["average_score"] > 0
    assert len(demo_dash["performance_history"]) > 0
    assert len(demo_dash["upcoming_tasks"]) >= 4
    assert len(demo_dash["events"]) >= 2
    assert len(demo_dash["announcements"]) >= 1
    assert len(demo_dash["reminders"]) >= 1

    assert new_dash["overview_stats"]["assessments_completed"] == 0
    assert new_dash["overview_stats"]["average_score"] == 0.0
    assert new_dash["performance_history"] == []
    assert new_dash["upcoming_tasks"] == []
    assert new_dash["recent_results"] == []
    assert new_dash["reminders"] == []

    # 2. Roadmap & Bookmarks Isolation
    demo_roadmap = client.get("/api/student/roadmap", headers=_headers(demo_token)).get_json()["data"]
    new_roadmap = client.get("/api/student/roadmap", headers=_headers(new_token)).get_json()["data"]
    assert len(demo_roadmap["bookmarked_ids"]) >= 2
    assert new_roadmap["bookmarked_ids"] == []
    assert len(new_roadmap["subjects"]) == len(demo_roadmap["subjects"])

    bm_resp = client.post(f"/api/student/subjects/{math_id}/bookmark", headers=_headers(new_token))
    assert bm_resp.status_code == 200
    assert bm_resp.get_json()["data"]["bookmarked"] is True

    # 3. Chapters & Topic Detail
    ch_demo = client.get(f"/api/student/subjects/{math_id}/chapters", headers=_headers(demo_token)).get_json()["data"]
    ch_new = client.get(f"/api/student/subjects/{math_id}/chapters", headers=_headers(new_token)).get_json()["data"]
    assert len(ch_demo["chapters"]) >= 16
    assert ch_demo["subject"]["overall_mastery"] > 0
    assert ch_new["subject"]["overall_mastery"] == 0.0
    assert all(c["mastery"] == 0.0 and c["status"] == "not_started" for c in ch_new["chapters"])

    td_resp = client.get(f"/api/student/topics/{first_topic_id}", headers=_headers(new_token))
    assert td_resp.status_code == 200
    assert td_resp.get_json()["data"]["topic"]["mastery"] == 0.0

    # 4. Practice Hub
    hub_demo = client.get("/api/student/practice-hub", headers=_headers(demo_token)).get_json()["data"]
    hub_new = client.get("/api/student/practice-hub", headers=_headers(new_token)).get_json()["data"]
    assert len(hub_demo["chapters"]) >= 16
    assert any(c["completed_count"] > 0 for c in hub_demo["chapters"])
    assert all(c["completed_count"] == 0 for c in hub_new["chapters"])

    # 5. Analysis & 365-day Heatmap
    an_demo = client.get("/api/student/analysis", headers=_headers(demo_token)).get_json()["data"]
    an_new = client.get("/api/student/analysis", headers=_headers(new_token)).get_json()["data"]
    assert an_demo["overall_mastery"] > 0
    assert an_demo["activity_heatmap"]["current_streak"] >= 12
    assert an_demo["activity_heatmap"]["active_days_count"] >= 84
    assert len(an_demo["competency_domains"]) == 5
    assert len(an_demo["error_patterns"]) >= 1

    assert an_new["overall_mastery"] == 0.0
    assert an_new["activity_heatmap"]["current_streak"] == 0
    assert an_new["activity_heatmap"]["active_days_count"] == 0
    assert an_new["activity_heatmap"]["total_questions"] == 0
    assert an_new["error_patterns"] == []
    assert all(d["score"] == 0.0 for d in an_new["competency_domains"])

    # 6. Weekly Progress
    wk_demo = client.get("/api/student/weekly-progress", headers=_headers(demo_token)).get_json()["data"]
    wk_new = client.get("/api/student/weekly-progress", headers=_headers(new_token)).get_json()["data"]
    assert len(wk_demo["weeks"]) == 8
    assert wk_demo["selected_week"]["total_hours"] > 0
    assert wk_demo["selected_week"]["rank"] is not None
    assert wk_new["selected_week"]["total_hours"] == 0.0
    assert wk_new["selected_week"]["tasks_completed"] == 0
    assert wk_new["selected_week"]["rank"] is None

    # 7. Report Card Bundle
    rc_demo = client.get("/api/student/report-card", headers=_headers(demo_token)).get_json()["data"]
    rc_new = client.get("/api/student/report-card", headers=_headers(new_token)).get_json()["data"]
    assert rc_demo["attendance"]["total"] >= 20
    assert len(rc_demo["feedback"]) >= 2
    assert len(rc_demo["achievements"]) == 5
    assert len(rc_demo["reports_by_term"]) >= 2

    assert rc_new["attendance"]["total"] == 0
    assert rc_new["feedback"] == []
    assert rc_new["achievements"] == []
    assert rc_new["reports_by_term"] == {}
    assert rc_new["rank"] is None


def test_student_live_progression_after_quiz_resource_task_and_session(app, client):
    with app.app_context():
        seed_rich_demo_accounts()
        math_subj = Subject.query.filter_by(code="MATH-9-UI").first()
        first_topic = Topic.query.filter_by(subject_id=math_subj.id).order_by(Topic.order_index.asc()).first()
        first_res = Resource.query.filter_by(topic_id=first_topic.id, approved=True).first()
        first_res_id = first_res.id

    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Active Learner",
            "email": "active.learner@example.com",
            "password": "password123",
            "grade": "Grade 9",
        },
    )
    assert reg_resp.status_code == 201
    token = reg_resp.get_json()["data"]["access_token"]

    # Pick first quiz assessment from Practice Hub
    hub = client.get("/api/student/practice-hub", headers=_headers(token)).get_json()["data"]
    first_quiz = None
    for ch in hub["chapters"]:
        if ch["quizzes"]:
            first_quiz = ch["quizzes"][0]
            break
    assert first_quiz is not None

    # Start -> Answer -> Submit quiz
    start_resp = client.post(f"/api/assessments/{first_quiz['assessment_id']}/start", headers=_headers(token))
    assert start_resp.status_code == 200
    att = start_resp.get_json()["data"]["attempt"]
    att_id = att["attempt_id"]
    q_id = att["questions"][0]["id"]

    ans_resp = client.post(
        f"/api/attempts/{att_id}/answers",
        json={"question_id": q_id, "answer_text": "b", "time_spent_seconds": 120},
        headers=_headers(token),
    )
    assert ans_resp.status_code == 200

    sub_resp = client.post(f"/api/attempts/{att_id}/submit", headers=_headers(token))
    assert sub_resp.status_code == 200

    # Heatmap, Streak, Weekly Progress, and Achievements automatically update for new student!
    an_data = client.get("/api/student/analysis", headers=_headers(token)).get_json()["data"]
    assert an_data["activity_heatmap"]["active_days_count"] == 1
    assert an_data["activity_heatmap"]["current_streak"] == 1
    assert an_data["activity_heatmap"]["total_questions"] >= 1

    wk_data = client.get("/api/student/weekly-progress", headers=_headers(token)).get_json()["data"]
    assert wk_data["selected_week"]["tasks_completed"] >= 1
    assert len(wk_data["sessions"]) >= 1

    rc_data = client.get("/api/student/report-card", headers=_headers(token)).get_json()["data"]
    assert any(a["code"] == "first_diagnostic" for a in rc_data["achievements"])

    # Resource review, task CRUD, and standalone study session
    rev_resp = client.post(
        f"/api/student/resources/{first_res_id}/review",
        json={"duration_seconds": 420},
        headers=_headers(token),
    )
    assert rev_resp.status_code == 200
    assert rev_resp.get_json()["data"]["reviewed"] is True

    task_resp = client.post(
        "/api/student/tasks",
        json={"title": "Review NCERT formulas"},
        headers=_headers(token),
    )
    assert task_resp.status_code == 201
    task_id = task_resp.get_json()["data"]["task"]["id"]

    toggle_resp = client.patch(
        f"/api/student/tasks/{task_id}",
        json={"is_done": True},
        headers=_headers(token),
    )
    assert toggle_resp.status_code == 200
    assert toggle_resp.get_json()["data"]["task"]["is_done"] is True

    # Another student cannot toggle this task (403)
    demo_token = _login(client, "student@demo.com")
    forbid_task = client.patch(f"/api/student/tasks/{task_id}", json={}, headers=_headers(demo_token))
    assert forbid_task.status_code == 403

    sess_resp = client.post(
        "/api/student/study-sessions",
        json={
            "title": "Evening Algebra Drill",
            "activity_type": "practice",
            "duration_minutes": 25,
            "platform": "mobile",
        },
        headers=_headers(token),
    )
    assert sess_resp.status_code == 201


def test_teacher_portal_endpoints_and_cross_class_isolation(app, client):
    with app.app_context():
        seed_rich_demo_accounts()
        demo_student = User.query.filter_by(email="student@demo.com").first()
        demo_student_id = demo_student.id
        class_9a = Class.query.filter_by(name="Class 9-A").first()
        class_9a_id = class_9a.id
        math_subj = Subject.query.filter_by(code="MATH-9-UI").first()
        first_topic_id = Topic.query.filter_by(subject_id=math_subj.id).order_by(Topic.order_index.asc()).first().id

        # Second isolated teacher teaching NO Class 9-A
        teacher_role = Role.query.filter_by(name="teacher").first()
        other_teacher = User(
            public_id="TCH-ISO-02",
            name="Other Teacher",
            email="other.teacher@example.com",
            password_hash=generate_password_hash("password123"),
            role_id=teacher_role.id,
            is_active=True,
        )
        db.session.add(other_teacher)
        db.session.commit()

    teacher_token = _login(client, "teacher@demo.com")
    other_teacher_token = _login(client, "other.teacher@example.com", "password123")
    student_token = _login(client, "student@demo.com")

    # 1. Dashboard & Real-time Activity
    dash_resp = client.get(f"/api/teacher/dashboard?class_id={class_9a_id}", headers=_headers(teacher_token))
    assert dash_resp.status_code == 200
    dash = dash_resp.get_json()["data"]
    assert dash["has_class"] is True
    assert len(dash["weekly_engagement"]) == 7
    assert len(dash["live_hourly_activity"]) > 0
    assert len(dash["needs_attention"]) >= 1

    act_resp = client.get(f"/api/teacher/activity?class_id={class_9a_id}", headers=_headers(teacher_token))
    assert act_resp.status_code == 200
    assert act_resp.get_json()["data"]["summary"]["total"] >= 1

    # 2. My Class & Announcement
    my_cls_resp = client.get("/api/teacher/my-class", headers=_headers(teacher_token))
    assert my_cls_resp.status_code == 200
    my_cls = my_cls_resp.get_json()["data"]
    assert my_cls["is_homeroom"] is True
    assert my_cls["homeroom_class"]["id"] == class_9a_id
    assert len(my_cls["students"]) >= 1

    put_ann = client.put(
        f"/api/teacher/classes/{class_9a_id}/announcement",
        json={"message": "Unit Test 3 starts Monday morning."},
        headers=_headers(teacher_token),
    )
    assert put_ann.status_code == 200
    assert put_ann.get_json()["data"]["announcement"]["message"] == "Unit Test 3 starts Monday morning."

    get_ann = client.get(f"/api/teacher/classes/{class_9a_id}/announcement", headers=_headers(teacher_token))
    assert get_ann.status_code == 200
    assert get_ann.get_json()["data"]["announcement"]["message"] == "Unit Test 3 starts Monday morning."

    # 3. Attendance Recording
    att_resp = client.post(
        f"/api/teacher/classes/{class_9a_id}/attendance",
        json={"records": [{"student_id": demo_student_id, "status": "present"}]},
        headers=_headers(teacher_token),
    )
    assert att_resp.status_code == 201
    assert att_resp.get_json()["data"]["updated_count"] == 1

    # 4. Topic Analytics
    ta_resp = client.get(
        f"/api/teacher/classes/{class_9a_id}/topics/{first_topic_id}/analytics",
        headers=_headers(teacher_token),
    )
    assert ta_resp.status_code == 200
    ta_data = ta_resp.get_json()["data"]
    assert len(ta_data["distribution"]) == 4
    assert len(ta_data["questions"]) >= 1

    # 5. Student Deep-Dive Profile, Notes, Reminders, Assign Practice
    prof_resp = client.get(f"/api/teacher/students/{demo_student_id}/profile", headers=_headers(teacher_token))
    assert prof_resp.status_code == 200
    prof = prof_resp.get_json()["data"]
    assert len(prof["calendar_days"]) == 30
    assert len(prof["lesson_progression"]) >= 16

    note_resp = client.post(
        f"/api/teacher/students/{demo_student_id}/notes",
        json={"comment_text": "Great improvement on transposition steps.", "tags": ["Algebra"]},
        headers=_headers(teacher_token),
    )
    assert note_resp.status_code == 201

    rem_resp = client.post(
        f"/api/teacher/students/{demo_student_id}/remind",
        json={"title": "Practice Check", "message": "Try the Polynomials review quiz today."},
        headers=_headers(teacher_token),
    )
    assert rem_resp.status_code == 201
    rem_id = rem_resp.get_json()["data"]["reminder"]["id"]

    assign_resp = client.post(
        f"/api/teacher/students/{demo_student_id}/assign-practice",
        json={"topic_id": first_topic_id, "title": "Fractions Extra Practice"},
        headers=_headers(teacher_token),
    )
    assert assign_resp.status_code == 201

    # Student immediately sees note in Report Card and marks reminder read
    stu_rc = client.get("/api/student/report-card", headers=_headers(student_token)).get_json()["data"]
    assert any("transposition steps" in fb["comment"] for fb in stu_rc["feedback"])

    read_rem = client.post(f"/api/student/reminders/{rem_id}/read", headers=_headers(student_token))
    assert read_rem.status_code == 200
    assert read_rem.get_json()["data"]["is_read"] is True

    # 6. Cross-Class & Role Isolation Guards (403)
    forbid_urls_get = [
        f"/api/teacher/dashboard?class_id={class_9a_id}",
        f"/api/teacher/activity?class_id={class_9a_id}",
        f"/api/teacher/classes/{class_9a_id}/announcement",
        f"/api/teacher/classes/{class_9a_id}/topics/{first_topic_id}/analytics",
        f"/api/teacher/students/{demo_student_id}/profile",
    ]
    for url in forbid_urls_get:
        assert client.get(url, headers=_headers(other_teacher_token)).status_code == 403
        assert client.get(url, headers=_headers(student_token)).status_code == 403

    assert client.post(
        f"/api/teacher/students/{demo_student_id}/notes",
        json={"comment_text": "Unauthorized note"},
        headers=_headers(other_teacher_token),
    ).status_code == 403
    assert client.post(
        f"/api/teacher/students/{demo_student_id}/remind",
        json={"message": "Unauthorized reminder"},
        headers=_headers(other_teacher_token),
    ).status_code == 403


def test_content_crud_similar_questions_and_batch_reports(app, client):
    with app.app_context():
        seed_rich_demo_accounts()
        math_subj = Subject.query.filter_by(code="MATH-9-UI").first()
        math_id = math_subj.id
        first_topic = Topic.query.filter_by(subject_id=math_id).order_by(Topic.order_index.asc()).first()
        first_topic_id = first_topic.id
        q1 = Question.query.filter_by(topic_id=first_topic_id, approved=True).first()
        q1_id = q1.id
        demo_student_id = User.query.filter_by(email="student@demo.com").first().id

    student_token = _login(client, "student@demo.com")
    teacher_token = _login(client, "teacher@demo.com")
    admin_token = _login(client, "admin@demo.com")

    # 1. Similar Questions (Anti-cheating stripped for students!)
    sim_stu = client.get(f"/api/content/questions/{q1_id}/similar", headers=_headers(student_token))
    assert sim_stu.status_code == 200
    sim_questions = sim_stu.get_json()["data"]["questions"]
    assert len(sim_questions) >= 1
    for q in sim_questions:
        assert "correct_answer" not in q
        assert "explanation" not in q
        assert "error_tags" not in q

    sim_teach = client.get(f"/api/content/questions/{q1_id}/similar", headers=_headers(teacher_token))
    assert sim_teach.status_code == 200
    assert "correct_answer" in sim_teach.get_json()["data"]["questions"][0]

    # 2. Topic list / create / update / delete
    topics_resp = client.get(f"/api/content/topics?subject_id={math_id}", headers=_headers(teacher_token))
    assert topics_resp.status_code == 200
    assert len(topics_resp.get_json()["data"]["topics"]) >= 16

    # Deleting a topic that has questions returns 400
    del_used = client.delete(f"/api/content/topics/{first_topic_id}", headers=_headers(teacher_token))
    assert del_used.status_code == 400

    # Create, update, and delete an unused topic
    ct_resp = client.post(
        "/api/content/topics",
        json={"subject_id": math_id, "title": "Temporary Topic", "order_index": 99},
        headers=_headers(teacher_token),
    )
    assert ct_resp.status_code == 201
    temp_tid = ct_resp.get_json()["data"]["topic"]["id"]

    ut_resp = client.patch(
        f"/api/content/topics/{temp_tid}",
        json={"title": "Updated Temp Topic", "is_pilot": False},
        headers=_headers(teacher_token),
    )
    assert ut_resp.status_code == 200
    assert ut_resp.get_json()["data"]["topic"]["title"] == "Updated Temp Topic"

    dt_resp = client.delete(f"/api/content/topics/{temp_tid}", headers=_headers(teacher_token))
    assert dt_resp.status_code == 200

    # 3. Subject PATCH (admin only)
    assert client.patch(
        f"/api/content/subjects/{math_id}",
        json={"badge_label": "Core Pilot"},
        headers=_headers(teacher_token),
    ).status_code == 403

    sub_patch = client.patch(
        f"/api/content/subjects/{math_id}",
        json={"badge_label": "Core Pilot"},
        headers=_headers(admin_token),
    )
    assert sub_patch.status_code == 200
    assert sub_patch.get_json()["data"]["subject"]["badge_label"] == "Core Pilot"

    # 4. Resource create / patch / delete & Question PATCH
    cr_resp = client.post(
        "/api/content/resources",
        json={
            "topic_id": first_topic_id,
            "title": "Temp Resource",
            "resource_type": "note",
            "url_or_path": "/resources/temp.md",
            "difficulty": 1,
            "approved": True,
        },
        headers=_headers(teacher_token),
    )
    assert cr_resp.status_code == 201
    res_id = cr_resp.get_json()["data"]["resource"]["id"]

    ur_resp = client.patch(
        f"/api/content/resources/{res_id}",
        json={"title": "Updated Resource"},
        headers=_headers(teacher_token),
    )
    assert ur_resp.status_code == 200
    assert ur_resp.get_json()["data"]["resource"]["title"] == "Updated Resource"

    dr_resp = client.delete(f"/api/content/resources/{res_id}", headers=_headers(teacher_token))
    assert dr_resp.status_code == 200

    pq_resp = client.patch(
        f"/api/content/questions/{q1_id}",
        json={"hint": "Updated helpful hint"},
        headers=_headers(teacher_token),
    )
    assert pq_resp.status_code == 200
    assert pq_resp.get_json()["data"]["question"]["hint"] == "Updated helpful hint"

    # 5. Batch Report Generation
    batch_rep = client.post(
        "/api/reports/students/generate",
        json={"student_ids": [demo_student_id], "subject_id": math_id, "term_label": "Term 2"},
        headers=_headers(teacher_token),
    )
    assert batch_rep.status_code == 201
    assert batch_rep.get_json()["data"]["count"] == 1
    assert client.post(
        "/api/reports/students/generate",
        json={"student_ids": [demo_student_id], "subject_id": math_id},
        headers=_headers(student_token),
    ).status_code == 403


def test_admin_user_class_and_system_status_endpoints(app, client):
    with app.app_context():
        seed_rich_demo_accounts()
        class_9a_id = Class.query.filter_by(name="Class 9-A").first().id
        teacher_id = User.query.filter_by(email="teacher@demo.com").first().id
        student_id = User.query.filter_by(email="student@demo.com").first().id

    admin_token = _login(client, "admin@demo.com")
    teacher_token = _login(client, "teacher@demo.com")
    student_token = _login(client, "student@demo.com")

    # Non-admins rejected (403)
    for tok in (teacher_token, student_token):
        assert client.get("/api/admin/teachers", headers=_headers(tok)).status_code == 403
        assert client.get("/api/admin/students", headers=_headers(tok)).status_code == 403
        assert client.get("/api/admin/system-status", headers=_headers(tok)).status_code == 403
        assert client.patch(f"/api/admin/classes/{class_9a_id}", json={}, headers=_headers(tok)).status_code == 403

    # Patch Class
    assert client.patch(
        f"/api/admin/classes/{class_9a_id}",
        json={"homeroom_teacher_id": student_id},
        headers=_headers(admin_token),
    ).status_code == 400

    cls_patch = client.patch(
        f"/api/admin/classes/{class_9a_id}",
        json={"homeroom_teacher_id": teacher_id},
        headers=_headers(admin_token),
    )
    assert cls_patch.status_code == 200
    assert cls_patch.get_json()["data"]["class"]["homeroom_teacher_id"] == teacher_id

    # Teachers list & create
    lt_resp = client.get("/api/admin/teachers", headers=_headers(admin_token))
    assert lt_resp.status_code == 200
    assert len(lt_resp.get_json()["data"]["teachers"]) >= 1

    ct_resp = client.post(
        "/api/admin/teachers",
        json={"name": "Admin Created Teacher", "email": "admin.teacher@example.com"},
        headers=_headers(admin_token),
    )
    assert ct_resp.status_code == 201
    assert ct_resp.get_json()["data"]["teacher"]["role"] == "teacher"
    assert "password_hash" not in ct_resp.get_json()["data"]["teacher"]

    # Duplicate teacher email -> 409
    assert client.post(
        "/api/admin/teachers",
        json={"name": "Dup", "email": "admin.teacher@example.com"},
        headers=_headers(admin_token),
    ).status_code == 409

    # Students list & create with auto-enrollment
    ls_resp = client.get("/api/admin/students", headers=_headers(admin_token))
    assert ls_resp.status_code == 200
    assert len(ls_resp.get_json()["data"]["students"]) >= 1

    cs_resp = client.post(
        "/api/admin/students",
        json={
            "name": "Admin Created Student",
            "email": "admin.student@example.com",
            "class_id": class_9a_id,
        },
        headers=_headers(admin_token),
    )
    assert cs_resp.status_code == 201
    assert cs_resp.get_json()["data"]["student"]["class_name"] == "Class 9-A"

    # System Status
    sys_resp = client.get("/api/admin/system-status", headers=_headers(admin_token))
    assert sys_resp.status_code == 200
    sys_data = sys_resp.get_json()["data"]
    assert sys_data["database_connected"] is True
    assert sys_data["table_counts"]["users"] >= 5
    assert sys_data["table_counts"]["subjects"] >= 12
