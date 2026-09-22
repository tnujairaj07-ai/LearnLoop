import secrets

import click
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.academic import Prerequisite, Resource, Skill, Subject, Topic
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.content import ErrorTag, Question, QuestionErrorTag
from app.models.user import Class, Enrollment, Role, TeacherAssignment, User


DEMO_DATA_SOURCE = "synthetic_demo"

TOPIC_SPECS = (
    {
        "title": "Fractions",
        "description": "Equivalent fractions and fraction operations.",
        "skills": ("Equivalent fractions", "Fraction operations"),
    },
    {
        "title": "Linear Equations",
        "description": "Solving one-variable linear equations.",
        "skills": ("Transposition", "Equation balancing"),
    },
    {
        "title": "Polynomials",
        "description": "Polynomial terms and basic operations.",
        "skills": ("Like terms", "Polynomial operations"),
    },
    {
        "title": "Geometry",
        "description": "Basic geometric properties and measurements.",
        "skills": ("Angle relationships", "Perimeter and area"),
    },
    {
        "title": "Statistics",
        "description": "Reading and summarizing simple data sets.",
        "skills": ("Central tendency", "Data interpretation"),
    },
)

ERROR_TAG_SPECS = (
    ("sign_error", "A sign was changed or applied incorrectly."),
    (
        "denominator_operation_error",
        "A fraction denominator operation was applied incorrectly.",
    ),
    ("incorrect_transposition", "A term was moved across an equation incorrectly."),
    ("formula_confusion", "An inappropriate formula was selected or applied."),
    ("arithmetic_slip", "A basic arithmetic step appears inconsistent."),
)


def _get_or_create(model, lookup, defaults):
    instance = model.query.filter_by(**lookup).one_or_none()
    if instance is not None:
        return instance, False

    instance = model(**lookup, **defaults)
    db.session.add(instance)
    db.session.flush()
    return instance, True


def _seed_user(email, public_id, name, role, password):
    user, created = _get_or_create(
        User,
        {"email": email},
        {
            "public_id": public_id,
            "name": name,
            "password_hash": generate_password_hash(password),
            "role_id": role.id,
            "is_active": True,
            "data_source": DEMO_DATA_SOURCE,
        },
    )
    return user, created


def _question_options(question_number):
    return [
        {"id": "a", "text": str(question_number - 1)},
        {"id": "b", "text": str(question_number)},
        {"id": "c", "text": str(question_number + 1)},
        {"id": "d", "text": str(question_number + 2)},
    ]


def _seed_questions(topic, skills, admin, error_tags):
    questions_by_kind = {"diagnostic": [], "practice": [], "reassessment": []}
    question_counts = {"diagnostic": 6, "practice": 8, "reassessment": 6}

    for kind, count in question_counts.items():
        for number in range(1, count + 1):
            skill = skills[(number - 1) % len(skills)]
            question_text = (
                f"{topic.title} {kind} item {number}: select the correct synthetic demo answer."
            )
            question, _ = _get_or_create(
                Question,
                {"topic_id": topic.id, "question_text": question_text},
                {
                    "skill_id": skill.id,
                    "question_type": "mcq",
                    "options_json": _question_options(number),
                    "correct_answer": "b",
                    "explanation": (
                        "Synthetic demonstration item. Replace with teacher-reviewed "
                        "Class 9 content before a pilot."
                    ),
                    "hint": "Review the worked example for this skill before selecting an answer.",
                    "difficulty": ((number - 1) % 3) + 1,
                    "created_by": admin.id,
                    "approved": True,
                },
            )
            error_tag = error_tags[(number - 1) % len(error_tags)]
            _get_or_create(
                QuestionErrorTag,
                {"question_id": question.id, "error_tag_id": error_tag.id},
                {"option_or_pattern": "a"},
            )
            questions_by_kind[kind].append(question)

    return questions_by_kind


def _seed_assessment(title, assessment_type, subject, topic, classroom, admin, questions):
    assessment, _ = _get_or_create(
        Assessment,
        {"title": title, "class_id": classroom.id},
        {
            "assessment_type": assessment_type,
            "subject_id": subject.id,
            "topic_id": topic.id if topic else None,
            "created_by": admin.id,
            "status": "published",
            "data_source": DEMO_DATA_SOURCE,
        },
    )
    for order_index, question in enumerate(questions, start=1):
        _get_or_create(
            AssessmentQuestion,
            {"assessment_id": assessment.id, "question_id": question.id},
            {"order_index": order_index, "points": 1.0},
        )
    return assessment


def seed_demo_data(password):
    """Create an idempotent, explicitly synthetic Class 9 Mathematics demo dataset."""
    roles = {}
    for name, description in (
        ("admin", "Manages pilot setup."),
        ("teacher", "Teaches the pilot class."),
        ("student", "Completes learning activities."),
    ):
        roles[name], _ = _get_or_create(
            Role, {"name": name}, {"description": description}
        )

    admin, _ = _seed_user(
        "admin@learnloop.demo", "DEMO-ADMIN-001", "Demo Admin", roles["admin"], password
    )
    teacher, _ = _seed_user(
        "teacher@learnloop.demo",
        "DEMO-TEACHER-001",
        "Demo Teacher",
        roles["teacher"],
        password,
    )

    classroom, _ = _get_or_create(
        Class,
        {"name": "Class 9-A", "academic_year": "2026-2027"},
        {
            "grade": "Class 9",
            "section": "A",
            "data_source": DEMO_DATA_SOURCE,
        },
    )
    subject, _ = _get_or_create(
        Subject,
        {"code": "MATH-9-DEMO"},
        {
            "name": "Mathematics",
            "description": "Synthetic Class 9 Mathematics demonstration content.",
            "data_source": DEMO_DATA_SOURCE,
        },
    )
    _get_or_create(
        TeacherAssignment,
        {
            "teacher_id": teacher.id,
            "class_id": classroom.id,
            "subject_id": subject.id,
        },
        {"is_active": True},
    )

    error_tags = []
    for name, description in ERROR_TAG_SPECS:
        error_tag, _ = _get_or_create(
            ErrorTag, {"name": name}, {"description": description}
        )
        error_tags.append(error_tag)

    topics = []
    questions = {}
    for order_index, spec in enumerate(TOPIC_SPECS, start=1):
        topic, _ = _get_or_create(
            Topic,
            {"subject_id": subject.id, "title": spec["title"]},
            {
                "description": spec["description"],
                "order_index": order_index,
                "mastery_threshold": 80.0,
            },
        )
        skills = []
        for skill_name in spec["skills"]:
            skill, _ = _get_or_create(
                Skill,
                {"topic_id": topic.id, "name": skill_name},
                {"description": f"Synthetic demo skill: {skill_name}."},
            )
            skills.append(skill)
        _get_or_create(
            Resource,
            {"topic_id": topic.id, "title": f"{topic.title} worked examples"},
            {
                "resource_type": "note",
                "url_or_path": f"/demo-resources/{topic.title.lower().replace(' ', '-')}.md",
                "description": "Synthetic demo resource for the Phase 2 data seed.",
                "difficulty": 1,
                "created_by": teacher.id,
                "approved": True,
            },
        )
        topics.append(topic)
        questions[topic.id] = _seed_questions(topic, skills, admin, error_tags)

    _get_or_create(
        Prerequisite,
        {"topic_id": topics[2].id, "required_topic_id": topics[1].id},
        {},
    )

    diagnostic_questions = [
        question
        for topic in topics
        for question in questions[topic.id]["diagnostic"]
    ]
    _seed_assessment(
        "Class 9 Mathematics diagnostic",
        "diagnostic",
        subject,
        None,
        classroom,
        teacher,
        diagnostic_questions,
    )
    for topic in topics:
        _seed_assessment(
            f"{topic.title} Level 1 practice",
            "practice",
            subject,
            topic,
            classroom,
            teacher,
            questions[topic.id]["practice"],
        )
        _seed_assessment(
            f"{topic.title} reassessment",
            "reassessment",
            subject,
            topic,
            classroom,
            teacher,
            questions[topic.id]["reassessment"],
        )

    student_specs = [
        ("student.a@learnloop.demo", "DEMO-STUDENT-A", "Student A"),
        ("student.b@learnloop.demo", "DEMO-STUDENT-B", "Student B"),
    ]
    student_specs.extend(
        (
            f"student.{number:02d}@learnloop.demo",
            f"DEMO-STUDENT-{number:02d}",
            f"Demo Student {number:02d}",
        )
        for number in range(3, 21)
    )
    for email, public_id, name in student_specs:
        student, _ = _seed_user(email, public_id, name, roles["student"], password)
        _get_or_create(
            Enrollment,
            {"student_id": student.id, "class_id": classroom.id},
            {"status": "active"},
        )

    db.session.commit()
    return {
        "students": len(student_specs),
        "topics": len(topics),
        "diagnostic_questions": len(diagnostic_questions),
        "practice_questions": sum(len(questions[topic.id]["practice"]) for topic in topics),
        "reassessment_questions": sum(
            len(questions[topic.id]["reassessment"]) for topic in topics
        ),
    }


def reset_demo_data():
    """Remove only records rooted in the explicitly synthetic demo dataset."""
    demo_classes = Class.query.filter_by(data_source=DEMO_DATA_SOURCE).all()
    demo_class_ids = [c.id for c in demo_classes]

    demo_subjects = Subject.query.filter_by(data_source=DEMO_DATA_SOURCE).all()
    demo_subject_ids = [s.id for s in demo_subjects]

    demo_users = User.query.filter_by(data_source=DEMO_DATA_SOURCE).all()
    demo_user_ids = [u.id for u in demo_users]

    # 1. Delete assessment questions and assessments
    demo_assessment_ids = [
        a.id for a in Assessment.query.filter_by(data_source=DEMO_DATA_SOURCE).all()
    ]
    if demo_assessment_ids:
        AssessmentQuestion.query.filter(
            AssessmentQuestion.assessment_id.in_(demo_assessment_ids)
        ).delete(synchronize_session=False)
        Assessment.query.filter(Assessment.id.in_(demo_assessment_ids)).delete(
            synchronize_session=False
        )

    # 2. Delete questions, question_error_tags, skills, resources, prerequisites, and topics
    if demo_subject_ids:
        demo_topics = Topic.query.filter(Topic.subject_id.in_(demo_subject_ids)).all()
        demo_topic_ids = [t.id for t in demo_topics]
        if demo_topic_ids:
            demo_question_ids = [
                q.id
                for q in Question.query.filter(Question.topic_id.in_(demo_topic_ids)).all()
            ]
            if demo_question_ids:
                QuestionErrorTag.query.filter(
                    QuestionErrorTag.question_id.in_(demo_question_ids)
                ).delete(synchronize_session=False)
                Question.query.filter(Question.id.in_(demo_question_ids)).delete(
                    synchronize_session=False
                )
            Resource.query.filter(Resource.topic_id.in_(demo_topic_ids)).delete(
                synchronize_session=False
            )
            Skill.query.filter(Skill.topic_id.in_(demo_topic_ids)).delete(
                synchronize_session=False
            )
            Prerequisite.query.filter(
                Prerequisite.topic_id.in_(demo_topic_ids)
                | Prerequisite.required_topic_id.in_(demo_topic_ids)
            ).delete(synchronize_session=False)
            Topic.query.filter(Topic.id.in_(demo_topic_ids)).delete(
                synchronize_session=False
            )

    # 3. Delete enrollments, teacher assignments, and classes
    if demo_class_ids:
        Enrollment.query.filter(Enrollment.class_id.in_(demo_class_ids)).delete(
            synchronize_session=False
        )
        TeacherAssignment.query.filter(
            TeacherAssignment.class_id.in_(demo_class_ids)
        ).delete(synchronize_session=False)
        Class.query.filter(Class.id.in_(demo_class_ids)).delete(
            synchronize_session=False
        )

    # 4. Delete demo subjects
    if demo_subject_ids:
        Subject.query.filter(Subject.id.in_(demo_subject_ids)).delete(
            synchronize_session=False
        )

    # 5. Delete demo users
    if demo_user_ids:
        User.query.filter(User.id.in_(demo_user_ids)).delete(
            synchronize_session=False
        )

    # 6. Delete synthetic error tags
    for name, _ in ERROR_TAG_SPECS:
        error_tag = ErrorTag.query.filter_by(name=name).one_or_none()
        if error_tag is not None:
            db.session.delete(error_tag)

    db.session.commit()


@click.command("seed-demo")
@click.option(
    "--password",
    envvar="DEMO_SEED_PASSWORD",
    help="Local password for synthetic demo accounts. It is never stored in source control.",
)
def seed_demo_command(password):
    """Seed the synthetic Class 9 Mathematics demonstration dataset."""
    generated_password = password is None
    password = password or secrets.token_urlsafe(18)
    summary = seed_demo_data(password)
    click.echo(
        "Seeded synthetic demo data: "
        f"{summary['students']} students, {summary['topics']} topics, "
        f"{summary['diagnostic_questions']} diagnostic questions, "
        f"{summary['practice_questions']} practice questions, and "
        f"{summary['reassessment_questions']} reassessment questions."
    )
    if generated_password:
        click.echo(f"Generated local demo password: {password}")


@click.command("reset-demo")
@click.option("--confirm", is_flag=True, help="Required because this deletes synthetic demo records.")
def reset_demo_command(confirm):
    """Delete the explicitly synthetic demo dataset without touching manual records."""
    if not confirm:
        raise click.UsageError("Pass --confirm to remove synthetic demo data.")
    reset_demo_data()
    click.echo("Removed synthetic demo data.")
