from datetime import datetime
from sqlalchemy import inspect

from app.extensions import db
from app.models.academic import Subject, Topic
from app.models.assessment import Assessment, AssessmentQuestion, Attempt
from app.models.content import Question
from app.models.user import Class, Enrollment, Role, User
from app.services.assessment_service import AssessmentService


def test_phase_two_and_phase_a_tables_are_registered(app):
    with app.app_context():
        insp = inspect(db.engine)
        table_names = set(insp.get_table_names())

        expected_tables = {
            # Core Phase 2 tables
            "roles",
            "users",
            "classes",
            "enrollments",
            "teacher_assignments",
            "subjects",
            "topics",
            "skills",
            "prerequisites",
            "resources",
            "questions",
            "error_tags",
            "question_error_tags",
            "assessments",
            "assessment_questions",
            "attempts",
            "answers",
            "mastery_records",
            "error_pattern_flags",
            "error_pattern_reviews",
            "recommendations",
            "recommendation_actions",
            "interventions",
            "intervention_students",
            "learning_gain_records",
            "reports",
            "audit_logs",
            # Phase A extended engagement, governance, and UI-backing tables
            "token_blocklist",
            "subject_bookmarks",
            "resource_views",
            "study_sessions",
            "student_daily_activity",
            "student_tasks",
            "attendance_records",
            "class_events",
            "class_announcements",
            "teacher_feedback",
            "achievements",
            "student_achievements",
            "student_reminders",
        }
        assert expected_tables.issubset(table_names)

        # Verify extended columns on existing tables
        assert "homeroom_teacher_id" in {c["name"] for c in insp.get_columns("classes")}
        assert {"category", "curriculum_label", "status", "badge_label", "icon"}.issubset(
            {c["name"] for c in insp.get_columns("subjects")}
        )
        assert {"unit_name", "common_mistake_tip", "is_pilot"}.issubset(
            {c["name"] for c in insp.get_columns("topics")}
        )
        assert "cognitive_domain" in {c["name"] for c in insp.get_columns("skills")}
        assert {
            "category",
            "exercise_label",
            "estimated_minutes",
            "difficulty_label",
            "due_date",
            "term_label",
            "allow_retakes",
        }.issubset({c["name"] for c in insp.get_columns("assessments")})
        assert "attempt_number" in {c["name"] for c in insp.get_columns("attempts")}


def test_practice_assessment_retake_increments_attempt_number(app):
    """Ensure allow_retakes=True supports multiple practice attempts while diagnostic stays single-attempt."""
    with app.app_context():
        role_s = Role(name="student")
        db.session.add(role_s)
        db.session.flush()

        student = User(
            public_id="RET-STU-1",
            name="Retake Tester",
            email="retake@learnloop.test",
            password_hash="hashed",
            role_id=role_s.id,
        )
        classroom = Class(name="Class 9-R", grade="Class 9", section="R", academic_year="2026-2027")
        subject = Subject(name="Math", code="M-RET", category="core", status="active")
        db.session.add_all([student, classroom, subject])
        db.session.flush()

        db.session.add(Enrollment(student_id=student.id, class_id=classroom.id, status="active"))
        topic = Topic(subject_id=subject.id, title="Retake Topic", order_index=1)
        db.session.add(topic)
        db.session.flush()

        question = Question(
            topic_id=topic.id,
            question_type="mcq",
            question_text="2 + 2 = ?",
            options_json=[{"id": "a", "text": "3"}, {"id": "b", "text": "4"}],
            correct_answer="b",
            explanation="2 + 2 = 4",
            hint="Add two and two",
            difficulty=1,
            approved=True,
        )
        db.session.add(question)
        db.session.flush()

        practice = Assessment(
            title="Repeatable Drill",
            assessment_type="practice",
            category="practice_quiz",
            subject_id=subject.id,
            topic_id=topic.id,
            class_id=classroom.id,
            status="published",
            allow_retakes=True,
            available_from=datetime(2026, 1, 1),
        )
        db.session.add(practice)
        db.session.flush()
        db.session.add(AssessmentQuestion(assessment_id=practice.id, question_id=question.id, order_index=1))
        db.session.commit()

        # First attempt
        s1 = AssessmentService.start_attempt(practice.id, student.id)
        att1 = db.session.get(Attempt, s1["attempt_id"])
        assert att1.attempt_number == 1
        att1.status = "scored"
        att1.submitted_at = datetime.utcnow()
        db.session.commit()

        # Second attempt (allowed because allow_retakes=True)
        s2 = AssessmentService.start_attempt(practice.id, student.id)
        att2 = db.session.get(Attempt, s2["attempt_id"])
        assert att2.id != att1.id
        assert att2.attempt_number == 2
