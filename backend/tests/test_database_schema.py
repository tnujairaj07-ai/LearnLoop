from sqlalchemy import inspect

from app.extensions import db


def test_phase_two_tables_are_registered(app):
    with app.app_context():
        table_names = set(inspect(db.engine).get_table_names())

    assert {
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
    }.issubset(table_names)
