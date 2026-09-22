from app.models import Assessment, Enrollment, Question, User
from app.seed.seed_data import reset_demo_data, seed_demo_data


def test_seed_demo_data_creates_the_pilot_dataset(app):
    with app.app_context():
        summary = seed_demo_data("test-only-password")

        assert summary == {
            "students": 20,
            "topics": 5,
            "diagnostic_questions": 30,
            "practice_questions": 40,
            "reassessment_questions": 30,
        }
        assert User.query.filter_by(data_source="synthetic_demo").count() == 22
        assert Enrollment.query.count() == 20
        assert Question.query.count() == 100
        assert Assessment.query.count() == 11


def test_seed_demo_data_is_idempotent(app):
    with app.app_context():
        seed_demo_data("test-only-password")
        seed_demo_data("test-only-password")

        assert User.query.filter_by(data_source="synthetic_demo").count() == 22
        assert Enrollment.query.count() == 20
        assert Question.query.count() == 100
        assert Assessment.query.count() == 11


def test_reset_demo_data_removes_pilot_dataset(app):
    with app.app_context():
        seed_demo_data("test-only-password")
        assert User.query.filter_by(data_source="synthetic_demo").count() == 22

        reset_demo_data()

        assert User.query.filter_by(data_source="synthetic_demo").count() == 0
        assert Enrollment.query.count() == 0
        assert Question.query.count() == 0
        assert Assessment.query.count() == 0
