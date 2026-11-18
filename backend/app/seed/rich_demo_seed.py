"""
Rich Demo Accounts & Curriculum Seeder (Phase B)

Creates and enriches real persistent database accounts for quick-login evaluation
(`admin@demo.com`, `teacher@demo.com`, `student@demo.com` + Class 9-A / 9-B peers)
so every page across Student, Teacher, and Admin portals renders real SQL data,
while newly registered accounts begin strictly at zero progress.

Idempotent across both fresh SQLite/MySQL databases and existing populated schemas.
"""

from datetime import date, datetime, timedelta

import click
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.academic import (
    Resource,
    ResourceView,
    Skill,
    Subject,
    SubjectBookmark,
    Topic,
)
from app.models.assessment import (
    Answer,
    Assessment,
    AssessmentQuestion,
    Attempt,
)
from app.models.content import ErrorTag, Question, QuestionErrorTag
from app.models.engagement import (
    Achievement,
    AttendanceRecord,
    ClassAnnouncement,
    ClassEvent,
    StudentAchievement,
    StudentDailyActivity,
    StudentReminder,
    StudentTask,
    StudySession,
    TeacherFeedback,
)
from app.models.governance import LearningGainRecord, Report
from app.models.intervention import Intervention, InterventionStudent
from app.models.mastery import (
    ErrorPatternFlag,
    ErrorPatternReview,
    MasteryRecord,
    Recommendation,
    RecommendationAction,
)
from app.models.user import Class, Enrollment, Role, TeacherAssignment, User

RICH_DATA_SOURCE = "rich_demo"


def _get_or_create(model, lookup, defaults=None):
    instance = model.query.filter_by(**lookup).first()
    if instance is not None:
        return instance, False
    params = {**lookup, **(defaults or {})}
    instance = model(**params)
    db.session.add(instance)
    db.session.flush()
    return instance, True


def _ensure_demo_user(email, public_id, name, role_obj, password_hash, data_source=RICH_DATA_SOURCE):
    normalized = email.strip().lower()
    user = User.query.filter_by(email=normalized).first()
    if user:
        return user, False
    # Ensure unique public_id if one already collided
    candidate_pid = public_id
    if User.query.filter_by(public_id=candidate_pid).first():
        candidate_pid = f"{public_id}-{abs(hash(normalized)) % 1000}"
    user = User(
        email=normalized,
        public_id=candidate_pid,
        name=name,
        password_hash=password_hash,
        role_id=role_obj.id,
        is_active=True,
        data_source=data_source,
    )
    db.session.add(user)
    db.session.flush()
    return user, True


SUBJECT_SPECS = [
    {
        "code": "MATH-9-UI",
        "name": "Mathematics",
        "category": "core",
        "curriculum_label": "CBSE Class 9 (NCERT)",
        "status": "active",
        "badge_label": "15 Chapters · Active Pilot",
        "icon": "📐",
        "description": "Number Systems, Polynomials, Linear Equations, Geometry, Mensuration, Statistics & Probability.",
    },
    {
        "code": "SCI-9-UI",
        "name": "Science",
        "category": "core",
        "curriculum_label": "CBSE Class 9 (Physics, Chem, Bio)",
        "status": "active",
        "badge_label": "NCERT Core",
        "icon": "🔬",
        "description": "Matter in Our Surroundings, Cells, Tissues, Motion, Force & Laws of Motion.",
    },
    {
        "code": "SOC-9-UI",
        "name": "Social Science",
        "category": "core",
        "curriculum_label": "Class 9 Core",
        "status": "coming_soon",
        "badge_label": "Term 2 Release",
        "icon": "🌍",
        "description": "French Revolution, Physical Features of India, Electoral Politics & Economics.",
    },
    {
        "code": "ENG-9-UI",
        "name": "English Language & Literature",
        "category": "core",
        "curriculum_label": "Class 9 Core",
        "status": "coming_soon",
        "badge_label": "Term 2 Release",
        "icon": "📚",
        "description": "Beehive Prose, Moments Reader, Formal Writing & Integrated Grammar.",
    },
    {
        "code": "HIN-9-UI",
        "name": "Hindi Course (A / B)",
        "category": "core",
        "curriculum_label": "Class 9 Core",
        "status": "coming_soon",
        "badge_label": None,
        "icon": "📖",
        "description": "Kshitij & Kritika Literature, Vyakaran, Samvaad & Nibandh.",
    },
    {
        "code": "IT-9-UI",
        "name": "Information Technology (Code 402)",
        "category": "skill",
        "curriculum_label": "Class 9 Skill Track",
        "status": "coming_soon",
        "badge_label": "New",
        "icon": "💻",
        "description": "Digital Documentation, Electronic Spreadsheets, Digital Presentation & Cyber Safety.",
    },
    {
        "code": "AI-9-UI",
        "name": "Artificial Intelligence (Code 417)",
        "category": "skill",
        "curriculum_label": "Class 9 Skill Track",
        "status": "coming_soon",
        "badge_label": "New",
        "icon": "🤖",
        "description": "AI Project Cycle, Computer Vision Intro, Data Exploration & Ethics.",
    },
    {
        "code": "AMATH-9-UI",
        "name": "Applied Mathematics & Logic",
        "category": "skill",
        "curriculum_label": "Class 9 Enrichment",
        "status": "coming_soon",
        "badge_label": None,
        "icon": "🧮",
        "description": "Mental Math Techniques, Pattern Recognition & Olympiad Reasoning.",
    },
    {
        "code": "ENV-9-UI",
        "name": "Environmental Education",
        "category": "enrichment",
        "curriculum_label": "Class 9 Interdisciplinary",
        "status": "coming_soon",
        "badge_label": None,
        "icon": "🌱",
        "description": "Ecosystem Stability, Resource Conservation & Climate Action.",
    },
    {
        "code": "SANS-9-UI",
        "name": "Sanskrit",
        "category": "elective",
        "curriculum_label": "Class 9 Elective",
        "status": "coming_soon",
        "badge_label": None,
        "icon": "📜",
        "description": "Shemushi Prathamo Bhaag, Sandhi, Karak & Sanskrit Vyakaran.",
    },
    {
        "code": "HPE-9-UI",
        "name": "Health & Physical Education",
        "category": "practical",
        "curriculum_label": "Class 9 Practical",
        "status": "coming_soon",
        "badge_label": None,
        "icon": "🏃",
        "description": "Sports Science, Physical Fitness Framework, Nutrition & Yoga.",
    },
    {
        "code": "FIN-9-UI",
        "name": "Financial Literacy & Commerce",
        "category": "skill",
        "curriculum_label": "Class 9 Skill Track",
        "status": "coming_soon",
        "badge_label": "New",
        "icon": "💰",
        "description": "Basics of Banking, Budgeting, Digital Payments & Financial Planning.",
    },
]

# Full Class 9 Math NCERT curriculum + Fractions remedial foundation
MATH_CHAPTER_SPECS = [
    {
        "title": "Fractions",
        "unit_name": "Unit I: Number Foundations",
        "description": "Equivalent fractions, lowest common denominators, and rational fraction operations.",
        "common_mistake_tip": "Never add denominators directly (a/b + c/d != (a+c)/(b+d)); always find a common multiple first.",
        "is_pilot": True,
        "skills": [
            ("Equivalent Fractions & LCM", "conceptual"),
            ("Fraction Operations & Equations", "fluency"),
        ],
    },
    {
        "title": "Number Systems",
        "unit_name": "Unit I: Number Systems",
        "description": "Rational and irrational numbers, real numbers and decimal expansions, rationalisation, and laws of exponents.",
        "common_mistake_tip": "Watch out for negative powers in exponent laws: a^(-n) = 1/a^n, and remember √a + √b ≠ √(a+b).",
        "is_pilot": True,
        "skills": [
            ("Rational & Irrational Expansions", "conceptual"),
            ("Denominator Rationalisation", "fluency"),
            ("Laws of Exponents", "problem_solving"),
        ],
    },
    {
        "title": "Polynomials",
        "unit_name": "Unit II: Algebra",
        "description": "Polynomials in one variable, degrees, zeroes, Remainder Theorem, factorisation, and algebraic identities.",
        "common_mistake_tip": "Do not forget the 2xy middle term in (x + y)² = x² + 2xy + y².",
        "is_pilot": True,
        "skills": [
            ("Degrees & Zeroes of Polynomials", "conceptual"),
            ("Remainder & Factor Theorem", "reasoning"),
            ("Algebraic Identities & Splitting Middle Term", "fluency"),
        ],
    },
    {
        "title": "Linear Equations",
        "unit_name": "Unit II: Algebra",
        "description": "Standard form ax + by + c = 0, infinite solutions, plotting straight-line graphs, and word problems.",
        "common_mistake_tip": "Equations like y = 3 represent a line parallel to the x-axis, not the y-axis; invert signs when transposing!",
        "is_pilot": True,
        "skills": [
            ("Standard Form & Transposition", "fluency"),
            ("Graphing Linear Equations", "conceptual"),
            ("Two-Variable Word Problems", "problem_solving"),
        ],
    },
    {
        "title": "Coordinate Geometry",
        "unit_name": "Unit III: Coordinate Geometry",
        "description": "Cartesian plane, abscissa, ordinate, origin, quadrant sign conventions, and point plotting.",
        "common_mistake_tip": "Always write x (abscissa) first and y (ordinate) second in (x, y).",
        "is_pilot": False,
        "skills": [
            ("Cartesian Axes & Quadrants", "conceptual"),
            ("Plotting Ordered Pairs", "accuracy"),
        ],
    },
    {
        "title": "Statistics",
        "unit_name": "Unit VI: Statistics & Probability",
        "description": "Frequency distributions, bar graphs, histograms with varying widths, frequency polygons, and central tendency.",
        "common_mistake_tip": "Always arrange observations in ascending order before calculating the median.",
        "is_pilot": True,
        "skills": [
            ("Frequency Tables & Histograms", "conceptual"),
            ("Mean, Median & Mode Interpretation", "accuracy"),
        ],
    },
    {
        "title": "Introduction to Euclid's Geometry",
        "unit_name": "Unit IV: Geometry",
        "description": "Euclid's definitions of point, line, and surface, 7 axioms, and 5 postulates.",
        "common_mistake_tip": "Axioms apply across all mathematics whereas postulates apply specifically to geometry.",
        "is_pilot": False,
        "skills": [
            ("Euclid's Axioms & Postulates", "reasoning"),
        ],
    },
    {
        "title": "Lines and Angles",
        "unit_name": "Unit IV: Geometry",
        "description": "Linear Pair Axiom, vertically opposite angles, parallel lines with transversals, and triangle angle sum.",
        "common_mistake_tip": "Consecutive interior angles on the same side of a transversal sum to 180°, they are not equal unless perpendicular.",
        "is_pilot": False,
        "skills": [
            ("Parallel Lines & Transversals", "reasoning"),
            ("Triangle Angle Sum Proofs", "problem_solving"),
        ],
    },
    {
        "title": "Triangles",
        "unit_name": "Unit IV: Geometry",
        "description": "Triangle congruence criteria (SAS, ASA, AAS, SSS, RHS), isosceles triangle properties, and inequalities.",
        "common_mistake_tip": "There is NO AAA or SSA congruence criterion; only SAS, ASA, AAS, SSS, and RHS prove congruence.",
        "is_pilot": True,
        "skills": [
            ("Triangle Congruence Criteria", "reasoning"),
            ("Isosceles Properties & Inequalities", "problem_solving"),
        ],
    },
    {
        "title": "Quadrilaterals",
        "unit_name": "Unit IV: Geometry",
        "description": "Parallelogram properties, special quadrilaterals, and the Mid-point Theorem.",
        "common_mistake_tip": "A rhombus has perpendicular diagonals, but its corner angles are only 90° when it is a square.",
        "is_pilot": False,
        "skills": [
            ("Parallelogram & Mid-Point Theorem", "reasoning"),
        ],
    },
    {
        "title": "Areas of Parallelograms and Triangles",
        "unit_name": "Unit IV: Geometry",
        "description": "Figures on the same base and between the same parallel lines.",
        "common_mistake_tip": "Equal area figures are not automatically congruent.",
        "is_pilot": False,
        "skills": [
            ("Same Base & Parallels Theorems", "reasoning"),
        ],
    },
    {
        "title": "Circles",
        "unit_name": "Unit IV: Geometry",
        "description": "Chords, perpendicular bisectors, subtended angles at centre and circumference, and cyclic quadrilaterals.",
        "common_mistake_tip": "Any angle inscribed in a semicircle is always 90°.",
        "is_pilot": False,
        "skills": [
            ("Chord & Cyclic Quadrilateral Theorems", "problem_solving"),
        ],
    },
    {
        "title": "Constructions",
        "unit_name": "Unit IV: Geometry",
        "description": "Compass-and-straightedge bisectors and triangle constructions.",
        "common_mistake_tip": "Keep compass arc construction lines visible and write steps sequentially.",
        "is_pilot": False,
        "skills": [
            ("Bisectors & Standard Angles", "accuracy"),
        ],
    },
    {
        "title": "Heron's Formula",
        "unit_name": "Unit V: Mensuration",
        "description": "Finding triangle and partitioned quadrilateral areas via semi-perimeter s = (a+b+c)/2.",
        "common_mistake_tip": "Calculate semi-perimeter by dividing perimeter by 2, not by 3.",
        "is_pilot": False,
        "skills": [
            ("Heron's Area Applications", "fluency"),
        ],
    },
    {
        "title": "Surface Areas and Volumes",
        "unit_name": "Unit V: Mensuration",
        "description": "3D surface areas and volumes of cubes, cuboids, cylinders, cones, spheres, and hemispheres.",
        "common_mistake_tip": "Convert all dimensions (cm vs m) to matching units before substituting into formulas.",
        "is_pilot": False,
        "skills": [
            ("3D Solid Surface Area & Volume", "problem_solving"),
        ],
    },
    {
        "title": "Probability",
        "unit_name": "Unit VI: Statistics & Probability",
        "description": "Experimental and empirical probability P(E) = favorable outcomes / total trials.",
        "common_mistake_tip": "Probability always satisfies 0 <= P(E) <= 1.",
        "is_pilot": False,
        "skills": [
            ("Empirical Probability Trials", "conceptual"),
        ],
    },
]

AUTHENTIC_QUESTIONS_BY_TOPIC = {
    "Fractions": [
        {
            "text": "What is the sum of 3/4 and 2/5?",
            "options": [
                {"id": "a", "text": "5/9"},
                {"id": "b", "text": "23/20"},
                {"id": "c", "text": "6/20"},
                {"id": "d", "text": "1 1/4"},
            ],
            "correct": "b",
            "explanation": "Find the lowest common denominator (20): 3/4 = 15/20 and 2/5 = 8/20. Sum = 23/20.",
            "hint": "Find a common denominator before adding fractions; never add denominators straight across.",
            "difficulty": 2,
            "error_tag": "denominator_operation_error",
            "distractor": "a",
        },
        {
            "text": "Evaluate: 5/6 - 1/3 in simplest form.",
            "options": [
                {"id": "a", "text": "4/3"},
                {"id": "b", "text": "1/2"},
                {"id": "c", "text": "4/6"},
                {"id": "d", "text": "2/3"},
            ],
            "correct": "b",
            "explanation": "Convert 1/3 to 2/6: 5/6 - 2/6 = 3/6 = 1/2.",
            "hint": "Rewrite 1/3 with denominator 6 first, then reduce.",
            "difficulty": 1,
            "error_tag": "denominator_operation_error",
            "distractor": "a",
        },
        {
            "text": "Solve for x: (2/3)x + 1/4 = 7/12.",
            "options": [
                {"id": "a", "text": "x = 1"},
                {"id": "b", "text": "x = 1/2"},
                {"id": "c", "text": "x = 3/4"},
                {"id": "d", "text": "x = 2/3"},
            ],
            "correct": "b",
            "explanation": "Subtract 1/4 (3/12) from 7/12 to get 4/12 = 1/3. Multiply by 3/2 to find x = 1/2.",
            "hint": "Subtract 1/4 from 7/12 using denominator 12 before isolating x.",
            "difficulty": 3,
            "error_tag": "incorrect_transposition",
            "distractor": "a",
        },
    ],
    "Number Systems": [
        {
            "text": "Which statement correctly explains whether zero is a rational number?",
            "options": [
                {"id": "a", "text": "No, because dividing by zero is undefined"},
                {"id": "b", "text": "Yes, because 0 can be written as 0/q for any non-zero integer q"},
                {"id": "c", "text": "No, because 0 is neither positive nor negative"},
                {"id": "d", "text": "Only when written as a decimal"},
            ],
            "correct": "b",
            "explanation": "0 = 0/1 = 0/5 matches p/q where p, q are integers and q ≠ 0. Thus 0 is rational.",
            "hint": "Check whether 0 fits the p/q form with denominator q ≠ 0.",
            "difficulty": 1,
            "error_tag": "formula_confusion",
            "distractor": "a",
        },
        {
            "text": "Which of the following numbers is an irrational number?",
            "options": [
                {"id": "a", "text": "√16"},
                {"id": "b", "text": "√7"},
                {"id": "c", "text": "0.333..."},
                {"id": "d", "text": "22/7"},
            ],
            "correct": "b",
            "explanation": "√7 is non-terminating and non-recurring; √16 = 4, 0.333... = 1/3, and 22/7 are rational.",
            "hint": "Look for a non-perfect square root.",
            "difficulty": 1,
            "error_tag": "formula_confusion",
            "distractor": "c",
        },
        {
            "text": "Rationalise the denominator of 1 / (√7 - 2).",
            "options": [
                {"id": "a", "text": "(√7 - 2) / 3"},
                {"id": "b", "text": "(√7 + 2) / 3"},
                {"id": "c", "text": "(√7 + 2) / 5"},
                {"id": "d", "text": "√7 + 2"},
            ],
            "correct": "b",
            "explanation": "Multiply numerator and denominator by (√7 + 2): (√7 + 2) / (7 - 4) = (√7 + 2)/3.",
            "hint": "Multiply top and bottom by the conjugate (√7 + 2).",
            "difficulty": 2,
            "error_tag": "sign_error",
            "distractor": "a",
        },
        {
            "text": "Evaluate: (64)^(1/2) × (64)^(1/6).",
            "options": [
                {"id": "a", "text": "8"},
                {"id": "b", "text": "16"},
                {"id": "c", "text": "32"},
                {"id": "d", "text": "4"},
            ],
            "correct": "b",
            "explanation": "Add exponents: 1/2 + 1/6 = 2/3. (64)^(2/3) = (4³)^(2/3) = 4² = 16.",
            "hint": "Use a^m × a^n = a^(m+n).",
            "difficulty": 3,
            "error_tag": "arithmetic_slip",
            "distractor": "a",
        },
    ],
    "Polynomials": [
        {
            "text": "What is the degree of the zero polynomial P(x) = 0?",
            "options": [
                {"id": "a", "text": "0"},
                {"id": "b", "text": "Not defined"},
                {"id": "c", "text": "1"},
                {"id": "d", "text": "Any real number"},
            ],
            "correct": "b",
            "explanation": "The degree of any non-zero constant polynomial is 0, whereas the degree of the zero polynomial is not defined.",
            "hint": "0 = 0·x = 0·x² = 0·x⁹, so no unique highest power exists.",
            "difficulty": 1,
            "error_tag": "formula_confusion",
            "distractor": "a",
        },
        {
            "text": "Find the value of the polynomial p(x) = 5x - 4x² + 3 at x = -1.",
            "options": [
                {"id": "a", "text": "2"},
                {"id": "b", "text": "-6"},
                {"id": "c", "text": "-4"},
                {"id": "d", "text": "-2"},
            ],
            "correct": "b",
            "explanation": "p(-1) = 5(-1) - 4(-1)² + 3 = -5 - 4(1) + 3 = -6.",
            "hint": "Remember (-1)² = +1 when substituting negative values.",
            "difficulty": 1,
            "error_tag": "sign_error",
            "distractor": "a",
        },
        {
            "text": "If (x - 1) is a factor of p(x) = kx² - 3x + k, find the value of k.",
            "options": [
                {"id": "a", "text": "k = -3/2"},
                {"id": "b", "text": "k = 3/2"},
                {"id": "c", "text": "k = 2/3"},
                {"id": "d", "text": "k = 3"},
            ],
            "correct": "b",
            "explanation": "By the Factor Theorem, p(1) = 0 => k(1) - 3(1) + k = 0 => 2k = 3 => k = 3/2.",
            "hint": "Substitute x = 1 and set the expression equal to zero.",
            "difficulty": 2,
            "error_tag": "sign_error",
            "distractor": "a",
        },
        {
            "text": "Factorise completely by splitting the middle term: 12x² - 7x + 1.",
            "options": [
                {"id": "a", "text": "(3x + 1)(4x - 1)"},
                {"id": "b", "text": "(3x - 1)(4x - 1)"},
                {"id": "c", "text": "(6x - 1)(2x - 1)"},
                {"id": "d", "text": "(12x - 1)(x - 1)"},
            ],
            "correct": "b",
            "explanation": "12x² - 4x - 3x + 1 = 4x(3x - 1) - 1(3x - 1) = (3x - 1)(4x - 1).",
            "hint": "Find two factors of +12 whose sum is -7.",
            "difficulty": 2,
            "error_tag": "sign_error",
            "distractor": "a",
        },
        {
            "text": "Without calculating cubes directly, find the value of (-12)³ + 7³ + 5³.",
            "options": [
                {"id": "a", "text": "1260"},
                {"id": "b", "text": "-1260"},
                {"id": "c", "text": "-420"},
                {"id": "d", "text": "-630"},
            ],
            "correct": "b",
            "explanation": "Since -12 + 7 + 5 = 0, a³ + b³ + c³ = 3abc = 3(-12)(7)(5) = -1260.",
            "hint": "Check the sum a + b + c first.",
            "difficulty": 3,
            "error_tag": "sign_error",
            "distractor": "a",
        },
    ],
    "Linear Equations": [
        {
            "text": "Express 2x + 3y = 9.35 in standard form ax + by + c = 0, and state c.",
            "options": [
                {"id": "a", "text": "c = 9.35"},
                {"id": "b", "text": "c = -9.35"},
                {"id": "c", "text": "c = -3"},
                {"id": "d", "text": "c = 0"},
            ],
            "correct": "b",
            "explanation": "Rearranging to ax + by + c = 0 gives 2x + 3y - 9.35 = 0, so c = -9.35.",
            "hint": "Move 9.35 to the left-hand side and flip its sign.",
            "difficulty": 1,
            "error_tag": "incorrect_transposition",
            "distractor": "a",
        },
        {
            "text": "If (2, 0) is a solution of 2x + 3y = k, find the value of k.",
            "options": [
                {"id": "a", "text": "k = 6"},
                {"id": "b", "text": "k = 4"},
                {"id": "c", "text": "k = 5"},
                {"id": "d", "text": "k = 2"},
            ],
            "correct": "b",
            "explanation": "Substitute x = 2 and y = 0: 2(2) + 3(0) = 4.",
            "hint": "Plug x = 2 and y = 0 directly into the equation.",
            "difficulty": 1,
            "error_tag": "arithmetic_slip",
            "distractor": "a",
        },
        {
            "text": "At what point does the graph of 3x + 4y = 12 intersect the y-axis?",
            "options": [
                {"id": "a", "text": "(4, 0)"},
                {"id": "b", "text": "(0, 3)"},
                {"id": "c", "text": "(3, 0)"},
                {"id": "d", "text": "(0, 4)"},
            ],
            "correct": "b",
            "explanation": "On the y-axis, x = 0. Then 4y = 12 => y = 3, giving point (0, 3).",
            "hint": "Every point on the y-axis has x = 0.",
            "difficulty": 2,
            "error_tag": "formula_confusion",
            "distractor": "c",
        },
        {
            "text": "If 3x - 7 = 14, what is the value of 2x + 1?",
            "options": [
                {"id": "a", "text": "7"},
                {"id": "b", "text": "15"},
                {"id": "c", "text": "14"},
                {"id": "d", "text": "21"},
            ],
            "correct": "b",
            "explanation": "3x = 21 => x = 7 => 2(7) + 1 = 15.",
            "hint": "Solve for x first, then evaluate 2x + 1.",
            "difficulty": 2,
            "error_tag": "sign_error",
            "distractor": "a",
        },
    ],
    "Coordinate Geometry": [
        {
            "text": "In which quadrant does the point (-3, 5) lie?",
            "options": [
                {"id": "a", "text": "Quadrant I"},
                {"id": "b", "text": "Quadrant II"},
                {"id": "c", "text": "Quadrant III"},
                {"id": "d", "text": "Quadrant IV"},
            ],
            "correct": "b",
            "explanation": "Since x < 0 and y > 0, (-3, 5) lies in Quadrant II.",
            "hint": "Check signs: (-, +) is upper-left.",
            "difficulty": 1,
            "error_tag": "formula_confusion",
            "distractor": "d",
        },
        {
            "text": "What are the coordinates of a point lying on the x-axis at a distance of 4 units to the left of the origin?",
            "options": [
                {"id": "a", "text": "(0, -4)"},
                {"id": "b", "text": "(-4, 0)"},
                {"id": "c", "text": "(4, 0)"},
                {"id": "d", "text": "(0, 4)"},
            ],
            "correct": "b",
            "explanation": "Points on the x-axis have y = 0; left of origin gives negative x = -4, so (-4, 0).",
            "hint": "x comes before y in (x, y).",
            "difficulty": 1,
            "error_tag": "sign_error",
            "distractor": "a",
        },
    ],
    "Statistics": [
        {
            "text": "Find the median of the observations: 14, 25, 14, 28, 18, 17, 18.",
            "options": [
                {"id": "a", "text": "28"},
                {"id": "b", "text": "18"},
                {"id": "c", "text": "17"},
                {"id": "d", "text": "25"},
            ],
            "correct": "b",
            "explanation": "Sorted ascending: 14, 14, 17, 18, 18, 25, 28. The 4th (middle) value is 18.",
            "hint": "Sort the values in ascending order before finding the middle term.",
            "difficulty": 1,
            "error_tag": "formula_confusion",
            "distractor": "a",
        },
        {
            "text": "What is the class mark of the class interval 90 - 120?",
            "options": [
                {"id": "a", "text": "30"},
                {"id": "b", "text": "105"},
                {"id": "c", "text": "90"},
                {"id": "d", "text": "110"},
            ],
            "correct": "b",
            "explanation": "Class mark = (Upper limit + Lower limit)/2 = (120 + 90)/2 = 105.",
            "hint": "Average the lower and upper limits of the interval.",
            "difficulty": 2,
            "error_tag": "formula_confusion",
            "distractor": "a",
        },
    ],
}

ACHIEVEMENT_CATALOG = [
    {
        "code": "first_diagnostic",
        "title": "Diagnostic Pioneer",
        "description": "Completed the Class 9 baseline diagnostic assessment to unlock personalized mastery tracking.",
        "category": "milestone",
        "badge_label": "Baseline Unlocked",
        "color_theme": "bg-blue-500 text-white",
        "icon_type": "milestone",
    },
    {
        "code": "fractions_mastery",
        "title": "Fractions Diagnostic Mastery Award",
        "description": "Achieved 100% reassessment score and mastered denominator & LCM operations.",
        "category": "mastery",
        "badge_label": "100% Accuracy",
        "color_theme": "bg-indigo-500 text-white",
        "icon_type": "mastery",
    },
    {
        "code": "streak_12_days",
        "title": "12-Day Active Practice Streak",
        "description": "Maintained consistent daily study sessions across 12 consecutive days.",
        "category": "consistency",
        "badge_label": "Top 5% Consistency",
        "color_theme": "bg-blue-600 text-white",
        "icon_type": "streak",
    },
    {
        "code": "problem_solver_month",
        "title": "Problem Solver of the Month",
        "description": "Recognized for high normalized learning gain (g >= 0.60) and strong algebraic perseverance.",
        "category": "award",
        "badge_label": "Teacher Commendation",
        "color_theme": "bg-rose-500 text-white",
        "icon_type": "award",
    },
    {
        "code": "cohort_merit",
        "title": "Class 9 Academic Merit Distinction",
        "description": "Ranked among the top cohort performers across Mathematics diagnostic and unit assessments.",
        "category": "olympiad",
        "badge_label": "Top Cohort Rank",
        "color_theme": "bg-amber-400 text-amber-950",
        "icon_type": "olympiad",
    },
]


def _ensure_math_curriculum(math_subject, teacher, admin, error_tags_map):
    """Ensure full NCERT Class 9 topics, skills, resources, authentic questions, and assessments exist."""
    topic_by_title = {}
    used_orders = {
        t.order_index: t
        for t in Topic.query.filter_by(subject_id=math_subject.id).all()
    }
    next_free_order = max(used_orders.keys(), default=0) + 1

    for idx, spec in enumerate(MATH_CHAPTER_SPECS, start=1):
        topic = Topic.query.filter_by(subject_id=math_subject.id, title=spec["title"]).first()
        if topic is None:
            order_val = idx if idx not in used_orders else next_free_order
            if order_val == next_free_order:
                next_free_order += 1
            topic = Topic(
                subject_id=math_subject.id,
                title=spec["title"],
                description=spec["description"],
                unit_name=spec["unit_name"],
                common_mistake_tip=spec["common_mistake_tip"],
                is_pilot=spec["is_pilot"],
                order_index=order_val,
                mastery_threshold=80.0,
            )
            db.session.add(topic)
            db.session.flush()
            used_orders[order_val] = topic
        else:
            topic.description = topic.description or spec["description"]
            topic.unit_name = spec["unit_name"]
            topic.common_mistake_tip = spec["common_mistake_tip"]
            topic.is_pilot = spec["is_pilot"]

        topic_by_title[spec["title"]] = topic

        # Ensure skills with cognitive domains
        skills = []
        for skill_name, domain in spec["skills"]:
            skill = Skill.query.filter_by(topic_id=topic.id, name=skill_name).first()
            if not skill:
                skill = Skill(
                    topic_id=topic.id,
                    name=skill_name,
                    description=f"NCERT Class 9 mastery skill: {skill_name}.",
                    cognitive_domain=domain,
                )
                db.session.add(skill)
                db.session.flush()
            else:
                skill.cognitive_domain = domain
            skills.append(skill)

        # Ensure rich resources per chapter
        res_defs = [
            (
                f"{spec['title']} Complete Concept Video",
                "video",
                f"https://www.youtube.com/results?search_query=ncert+class+9+{spec['title'].lower().replace(' ', '+')}",
                f"Guided video lecture covering key concepts in {spec['title']}.",
                1,
            ),
            (
                f"{spec['title']} Formula Sheet & Worked Examples",
                "note",
                f"/resources/{spec['title'].lower().replace(' ', '-')}-notes.md",
                f"Concise revision notes, formulas, and common misconception tips for {spec['title']}.",
                1,
            ),
            (
                f"{spec['title']} Step-by-Step Solved Drills",
                "example",
                f"/resources/{spec['title'].lower().replace(' ', '-')}-examples.md",
                f"Step-by-step solved exemplar problems for {spec['title']}.",
                2,
            ),
        ]
        for r_title, r_type, r_url, r_desc, r_diff in res_defs:
            _get_or_create(
                Resource,
                {"topic_id": topic.id, "title": r_title},
                {
                    "resource_type": r_type,
                    "url_or_path": r_url,
                    "description": r_desc,
                    "difficulty": r_diff,
                    "created_by": teacher.id,
                    "approved": True,
                },
            )

        # Seed authentic NCERT questions
        auth_items = AUTHENTIC_QUESTIONS_BY_TOPIC.get(spec["title"], [])
        if not auth_items:
            auth_items = [
                {
                    "text": f"{spec['title']} Core Check 1: Apply fundamental properties of {spec['title']}.",
                    "options": [
                        {"id": "a", "text": "Apply inverse substitution blindly"},
                        {"id": "b", "text": f"Apply verified theorem from {spec['title']}"},
                        {"id": "c", "text": "Omit boundary conditions"},
                        {"id": "d", "text": "None of the above"},
                    ],
                    "correct": "b",
                    "explanation": f"Step-by-step NCERT derivation confirms the verified theorem for {spec['title']}.",
                    "hint": spec["common_mistake_tip"],
                    "difficulty": 1,
                    "error_tag": "formula_confusion",
                    "distractor": "a",
                },
                {
                    "text": f"{spec['title']} Practice Problem 2: Solve multi-step exercise from {spec['unit_name']}.",
                    "options": [
                        {"id": "a", "text": "Direct unsimplified step"},
                        {"id": "b", "text": "Simplified canonical NCERT result"},
                        {"id": "c", "text": "Opposite sign result"},
                        {"id": "d", "text": "Undefined"},
                    ],
                    "correct": "b",
                    "explanation": f"Careful algebraic simplification yields the canonical result in {spec['title']}.",
                    "hint": "Double check signs and units before concluding.",
                    "difficulty": 2,
                    "error_tag": "sign_error",
                    "distractor": "c",
                },
            ]

        topic_questions = []
        for q_idx, q_item in enumerate(auth_items):
            q_obj = Question.query.filter_by(topic_id=topic.id, question_text=q_item["text"]).first()
            if not q_obj:
                skill_target = skills[q_idx % len(skills)] if skills else None
                q_obj = Question(
                    topic_id=topic.id,
                    skill_id=skill_target.id if skill_target else None,
                    question_type="mcq",
                    question_text=q_item["text"],
                    options_json=q_item["options"],
                    correct_answer=q_item["correct"],
                    explanation=q_item["explanation"],
                    hint=q_item["hint"],
                    difficulty=q_item["difficulty"],
                    created_by=admin.id,
                    approved=True,
                )
                db.session.add(q_obj)
                db.session.flush()
            topic_questions.append(q_obj)

            tag_obj = error_tags_map.get(q_item["error_tag"])
            if tag_obj:
                _get_or_create(
                    QuestionErrorTag,
                    {"question_id": q_obj.id, "error_tag_id": tag_obj.id},
                    {"option_or_pattern": q_item["distractor"]},
                )

    return topic_by_title


def _ensure_assessments_for_class(classroom, math_subject, topic_by_title, teacher):
    """Ensure categorized assignments, repeatable practice quizzes, and assessments exist."""
    now = datetime.utcnow()
    created_map = {}

    for order_idx, spec in enumerate(MATH_CHAPTER_SPECS, start=1):
        topic = topic_by_title[spec["title"]]
        q_pool = Question.query.filter_by(topic_id=topic.id, approved=True).all()
        if not q_pool:
            continue

        # Ensure any existing "<Title> Practice Quiz" allows retakes & has clean metadata
        existing_quiz = Assessment.query.filter(
            Assessment.class_id == classroom.id,
            Assessment.topic_id == topic.id,
            Assessment.assessment_type == "practice",
        ).all()
        for eq in existing_quiz:
            eq.allow_retakes = True
            eq.category = "practice_quiz"
            if not eq.exercise_label:
                eq.exercise_label = f"Exercise {order_idx}.1"

        # 1. Exercise Assignment (repeatable)
        asg_title = f"Assignment {order_idx}.1: {spec['title']} Fundamentals"
        asg = Assessment.query.filter_by(title=asg_title, class_id=classroom.id).first()
        if not asg:
            asg = Assessment(
                title=asg_title,
                assessment_type="practice",
                category="assignment",
                exercise_label=f"Exercise {order_idx}.1",
                estimated_minutes=20,
                difficulty_label="medium",
                term_label="Half Yearly",
                allow_retakes=True,
                subject_id=math_subject.id,
                topic_id=topic.id,
                class_id=classroom.id,
                created_by=teacher.id,
                available_from=now - timedelta(days=60),
                status="published",
                data_source=RICH_DATA_SOURCE,
            )
            db.session.add(asg)
            db.session.flush()
            for q_order, q in enumerate(q_pool[:6], start=1):
                db.session.add(
                    AssessmentQuestion(assessment_id=asg.id, question_id=q.id, order_index=q_order, points=1.0)
                )

        # 2. Practice Quiz Drill
        quiz_title = f"{spec['title']} Practice Quiz"
        quiz = Assessment.query.filter_by(title=quiz_title, class_id=classroom.id).first()
        if not quiz:
            quiz = Assessment(
                title=quiz_title,
                assessment_type="practice",
                category="practice_quiz",
                exercise_label=f"Ex {order_idx}.1 - {order_idx}.2",
                estimated_minutes=15,
                difficulty_label="medium",
                term_label="Unit Test 2",
                allow_retakes=True,
                subject_id=math_subject.id,
                topic_id=topic.id,
                class_id=classroom.id,
                created_by=teacher.id,
                available_from=now - timedelta(days=60),
                status="published",
                data_source=RICH_DATA_SOURCE,
            )
            db.session.add(quiz)
            db.session.flush()
            for q_order, q in enumerate(q_pool[:6], start=1):
                db.session.add(
                    AssessmentQuestion(assessment_id=quiz.id, question_id=q.id, order_index=q_order, points=1.0)
                )
        else:
            quiz.allow_retakes = True
            quiz.category = "practice_quiz"
            quiz.exercise_label = quiz.exercise_label or f"Ex {order_idx}.1 - {order_idx}.2"

        # 3. Chapter Mock / Reassessment
        test_title = f"{spec['title']} Chapter Reassessment"
        reassess = Assessment.query.filter_by(title=test_title, class_id=classroom.id).first()
        if not reassess:
            reassess = Assessment(
                title=test_title,
                assessment_type="reassessment",
                category="reassessment",
                exercise_label=f"Chapter {order_idx} Check",
                estimated_minutes=25,
                difficulty_label="medium",
                term_label="Half Yearly",
                allow_retakes=True,
                subject_id=math_subject.id,
                topic_id=topic.id,
                class_id=classroom.id,
                created_by=teacher.id,
                available_from=now - timedelta(days=60),
                status="published",
                data_source=RICH_DATA_SOURCE,
            )
            db.session.add(reassess)
            db.session.flush()
            for q_order, q in enumerate(q_pool[:6], start=1):
                db.session.add(
                    AssessmentQuestion(assessment_id=reassess.id, question_id=q.id, order_index=q_order, points=1.0)
                )

        created_map[spec["title"]] = {"assignment": asg, "quiz": quiz, "reassessment": reassess}

    return created_map


def _seed_student_baseline_evidence(
    student_demo,
    classmates,
    teacher,
    class_9a,
    math_subject,
    topic_by_title,
    assessments_by_topic,
    error_tags_map,
):
    """
    If running on an empty DB (e.g. test suite), populate historical attempts,
    mastery snapshots, error pattern flags, recommendations, interventions, and learning gains
    for `student@demo.com` and demo classmates cleanly without duplicating existing live DB records.
    """
    now = datetime.utcnow()
    existing_attempts = Attempt.query.filter_by(student_id=student_demo.id).count()

    if existing_attempts == 0:
        # Target realistic mastery distribution matching UI demo story:
        # Fractions improved (38 -> 86), Number Systems strong (88), Polynomials (62),
        # Linear Equations weak with active misconception flag (47), Statistics (72)
        demo_topic_outcomes = [
            ("Fractions", "quiz", 35.0, now - timedelta(days=28), True),
            ("Fractions", "reassessment", 100.0, now - timedelta(days=14), False),
            ("Number Systems", "quiz", 85.0, now - timedelta(days=20), False),
            ("Polynomials", "quiz", 65.0, now - timedelta(days=12), False),
            ("Linear Equations", "quiz", 40.0, now - timedelta(days=5), True),
            ("Coordinate Geometry", "quiz", 80.0, now - timedelta(days=9), False),
            ("Statistics", "quiz", 75.0, now - timedelta(days=7), False),
        ]

        fractions_pre_att = None
        fractions_post_att = None

        for idx, (t_title, kind, pct, ts, trigger_err) in enumerate(demo_topic_outcomes):
            assess_info = assessments_by_topic.get(t_title)
            if not assess_info or kind not in assess_info:
                continue
            assess = assess_info[kind]
            aqs = sorted(assess.questions, key=lambda x: x.order_index)
            total_pts = max(len(aqs), 1)
            correct_target = round((pct / 100.0) * total_pts)

            attempt = Attempt.query.filter_by(
                assessment_id=assess.id, student_id=student_demo.id, attempt_number=1
            ).first()
            if not attempt:
                attempt = Attempt(
                    assessment_id=assess.id,
                    student_id=student_demo.id,
                    attempt_number=1,
                    attempt_type=assess.assessment_type,
                    status="scored",
                    started_at=ts - timedelta(minutes=14),
                    submitted_at=ts,
                    score=float(correct_target),
                    percentage=pct,
                )
                db.session.add(attempt)
                db.session.flush()

                for q_i, aq in enumerate(aqs):
                    q = aq.question
                    is_corr = q_i < correct_target
                    err_id = None
                    ans_text = q.correct_answer
                    if not is_corr:
                        q_tag = QuestionErrorTag.query.filter_by(question_id=q.id).first()
                        ans_text = q_tag.option_or_pattern if q_tag and q_tag.option_or_pattern else "a"
                        if trigger_err and q_tag:
                            err_id = q_tag.error_tag_id

                    db.session.add(
                        Answer(
                            attempt_id=attempt.id,
                            question_id=q.id,
                            answer_text=ans_text,
                            is_correct=is_corr,
                            time_spent_seconds=35 + (q_i * 5),
                            detected_error_tag_id=err_id,
                        )
                    )

            if t_title == "Fractions" and kind == "quiz":
                fractions_pre_att = attempt
            elif t_title == "Fractions" and kind == "reassessment":
                fractions_post_att = attempt

        # Populate realistic MasteryRecord snapshots for Aanya Sharma (`student@demo.com`)
        if MasteryRecord.query.filter_by(student_id=student_demo.id).count() == 0:
            mastery_specs = [
                ("Fractions", 38.0, 35.0, 40.0, 42.0, 35.0, 3, now - timedelta(days=28)),
                ("Fractions", 84.0, 88.0, 75.0, 86.0, 82.0, 6, now - timedelta(days=14)),
                ("Number Systems", 88.0, 90.0, 82.0, 90.0, 86.0, 5, now - timedelta(days=10)),
                ("Polynomials", 62.0, 66.0, 60.0, 64.0, 58.0, 5, now - timedelta(days=8)),
                ("Linear Equations", 47.0, 48.0, 50.0, 55.0, 36.0, 6, now - timedelta(days=3)),
                ("Coordinate Geometry", 74.0, 80.0, 68.0, 76.0, 70.0, 4, now - timedelta(days=6)),
                ("Lines and Angles", 48.0, 52.0, 45.0, 50.0, 44.0, 3, now - timedelta(days=5)),
                ("Statistics", 72.0, 75.0, 65.0, 78.0, 68.0, 4, now - timedelta(days=4)),
            ]
            for t_name, m_score, acc, diff, rec, tr, ev_n, calc_ts in mastery_specs:
                t_obj = topic_by_title.get(t_name)
                if t_obj:
                    db.session.add(
                        MasteryRecord(
                            student_id=student_demo.id,
                            topic_id=t_obj.id,
                            mastery_score=m_score,
                            accuracy_component=acc,
                            difficulty_component=diff,
                            recency_component=rec,
                            trend_component=tr,
                            evidence_count=ev_n,
                            calculated_at=calc_ts,
                            model_version="heuristic-v1",
                        )
                    )

        # Populate ErrorPatternFlags (1 active on Linear Equations, 1 resolved on Fractions)
        lin_topic = topic_by_title.get("Linear Equations")
        frac_topic = topic_by_title.get("Fractions")
        sign_tag = error_tags_map.get("sign_error")
        denom_tag = error_tags_map.get("denominator_operation_error")

        if lin_topic and sign_tag and ErrorPatternFlag.query.filter_by(student_id=student_demo.id).count() == 0:
            active_flag = ErrorPatternFlag(
                student_id=student_demo.id,
                topic_id=lin_topic.id,
                error_tag_id=sign_tag.id,
                evidence_count=10,
                incorrect_count=5,
                match_count=4,
                evidence_json={"note": "Repeated sign reversal across Linear Equations transpositions"},
                status="suspected",
                calculated_at=now - timedelta(days=2),
            )
            db.session.add(active_flag)
            db.session.flush()
            db.session.add(
                ErrorPatternReview(
                    error_pattern_flag_id=active_flag.id,
                    reviewer_id=teacher.id,
                    decision="confirmed",
                    note="Focus on inverse operations step before division during tutoring.",
                )
            )

        if frac_topic and denom_tag:
            resolved_flag = ErrorPatternFlag(
                student_id=student_demo.id,
                topic_id=frac_topic.id,
                error_tag_id=denom_tag.id,
                evidence_count=8,
                incorrect_count=4,
                match_count=3,
                evidence_json={"note": "Resolved after Fractions remediation practice"},
                status="reviewed",
                calculated_at=now - timedelta(days=28),
                resolved_at=now - timedelta(days=14),
            )
            db.session.add(resolved_flag)

        # Populate Active Recommendation + Multi-Step Actions
        if lin_topic and Recommendation.query.filter_by(student_id=student_demo.id).count() == 0:
            rec = Recommendation(
                student_id=student_demo.id,
                topic_id=lin_topic.id,
                recommendation_type="targeted_practice",
                reason="Sign reversal errors lowered accuracy on 2-step equations. Complete the remedial walkthrough and drill.",
                evidence_json={"mastery": 47.0, "recurrent_error": "sign_error", "match_count": 4},
                priority="high",
                status="in_progress",
            )
            db.session.add(rec)
            db.session.flush()

            lin_res = Resource.query.filter_by(topic_id=lin_topic.id).first()
            lin_quiz = assessments_by_topic.get("Linear Equations", {}).get("quiz")
            lin_reassess = assessments_by_topic.get("Linear Equations", {}).get("reassessment")
            db.session.add_all(
                [
                    RecommendationAction(
                        recommendation_id=rec.id,
                        action_type="resource",
                        resource_id=lin_res.id if lin_res else None,
                        target_topic_id=lin_topic.id,
                        title="Review Sign-Error Transposition Walkthrough",
                        order_index=1,
                        status="completed",
                        completed_at=now - timedelta(days=1),
                    ),
                    RecommendationAction(
                        recommendation_id=rec.id,
                        action_type="practice",
                        assessment_id=lin_quiz.id if lin_quiz else None,
                        target_topic_id=lin_topic.id,
                        title="Attempt 6 Targeted Linear Equations Problems",
                        order_index=2,
                        status="pending",
                    ),
                    RecommendationAction(
                        recommendation_id=rec.id,
                        action_type="reassessment",
                        assessment_id=lin_reassess.id if lin_reassess else None,
                        target_topic_id=lin_topic.id,
                        title="Complete Linear Equations Post-Intervention Check",
                        order_index=3,
                        status="pending",
                    ),
                ]
            )

        # Populate Interventions & LearningGainRecord
        if frac_topic and Intervention.query.filter_by(teacher_id=teacher.id).count() == 0:
            reassess_frac = assessments_by_topic.get("Fractions", {}).get("reassessment")
            inv_done = Intervention(
                teacher_id=teacher.id,
                class_id=class_9a.id,
                subject_id=math_subject.id,
                topic_id=frac_topic.id,
                title="Fractions Denominator & LCM Remediation",
                reason="Diagnostic revealed common denominator operation confusion across Class 9-A.",
                evidence_json={"affected_students": 6, "avg_mastery": 42.0},
                recommended_action="20-min fraction strip revision + targeted drills + post-test reassessment.",
                status="completed",
                reassessment_id=reassess_frac.id if reassess_frac else None,
                assigned_at=now - timedelta(days=24),
                completed_at=now - timedelta(days=14),
            )
            db.session.add(inv_done)
            db.session.flush()
            db.session.add(
                InterventionStudent(
                    intervention_id=inv_done.id,
                    student_id=student_demo.id,
                    before_mastery=38.0,
                    after_mastery=84.0,
                    outcome="Strong improvement",
                    status="completed",
                    assigned_at=now - timedelta(days=24),
                    completed_at=now - timedelta(days=14),
                )
            )
            if fractions_pre_att and fractions_post_att:
                db.session.add(
                    LearningGainRecord(
                        student_id=student_demo.id,
                        topic_id=frac_topic.id,
                        intervention_id=inv_done.id,
                        diagnostic_attempt_id=fractions_pre_att.id,
                        reassessment_attempt_id=fractions_post_att.id,
                        pre_score=35.0,
                        post_score=100.0,
                        score_gain=1.0,
                        before_mastery=38.0,
                        after_mastery=84.0,
                        mastery_gain=46.0,
                    )
                )

            if lin_topic:
                inv_pending = Intervention(
                    teacher_id=teacher.id,
                    class_id=class_9a.id,
                    subject_id=math_subject.id,
                    topic_id=lin_topic.id,
                    title="Linear Equations Transposition Sign Rules",
                    reason="Multiple students reversing signs when isolating two-step variables.",
                    evidence_json={"affected_students": 5, "avg_mastery": 47.0},
                    recommended_action="Targeted drill on balancing equations before division.",
                    status="suggested",
                )
                db.session.add(inv_pending)

    # Seed baseline mastery snapshots for classmates on empty DB so Class Analytics & Matrix work richly
    sample_scores_by_index = [38.0, 74.0, 44.0, 88.0, 82.0, 64.0, 52.0, 36.0, 68.0, 76.0]
    core_topics = [
        topic_by_title[t]
        for t in ("Fractions", "Number Systems", "Polynomials", "Linear Equations", "Statistics")
        if t in topic_by_title
    ]
    for peer_idx, peer in enumerate(classmates):
        if MasteryRecord.query.filter_by(student_id=peer.id).count() == 0:
            base = sample_scores_by_index[peer_idx % len(sample_scores_by_index)]
            for t_i, t_obj in enumerate(core_topics):
                score_val = max(25.0, min(96.0, base + ((t_i % 3) - 1) * 8.0))
                db.session.add(
                    MasteryRecord(
                        student_id=peer.id,
                        topic_id=t_obj.id,
                        mastery_score=score_val,
                        accuracy_component=score_val,
                        difficulty_component=min(100.0, score_val + 4.0),
                        recency_component=80.0,
                        trend_component=55.0 + ((peer_idx % 4) * 5.0),
                        evidence_count=4,
                        calculated_at=now - timedelta(days=2 + (peer_idx % 5)),
                        model_version="heuristic-v1",
                    )
                )


def seed_rich_demo_accounts(password="demo1234"):
    """
    Create and populate real database records for `admin@demo.com`, `teacher@demo.com`,
    and `student@demo.com` (plus Class 9-A / 9-B peers) across all Phase A & core tables.
    """
    now = datetime.utcnow()
    today = date.today()
    pw_hash = generate_password_hash(password)

    # 1. Roles
    roles = {}
    for r_name, desc in (
        ("admin", "School academic administrator."),
        ("teacher", "Faculty and homeroom teacher."),
        ("student", "Enrolled learner."),
    ):
        roles[r_name], _ = _get_or_create(Role, {"name": r_name}, {"description": desc})

    # 2. Primary Demo Accounts & Faculty
    admin, _ = _ensure_demo_user("admin@demo.com", "DEMO-ADM-001", "Jordan Lee", roles["admin"], pw_hash)
    teacher, _ = _ensure_demo_user("teacher@demo.com", "DEMO-TCH-001", "Alex Rivera", roles["teacher"], pw_hash)
    priya, _ = _ensure_demo_user("priya.nair@learnloop.edu", "TCH-9B-002", "Priya Nair", roles["teacher"], pw_hash)
    student_demo, _ = _ensure_demo_user("student@demo.com", "STU-4819", "Aanya Sharma", roles["student"], pw_hash)

    # 3. Classes with Homeroom Teacher Assignment
    class_9a, _ = _get_or_create(
        Class,
        {"name": "Class 9-A", "academic_year": "2026-2027"},
        {"grade": "Class 9", "section": "A", "data_source": RICH_DATA_SOURCE},
    )
    class_9b, _ = _get_or_create(
        Class,
        {"name": "Class 9-B", "academic_year": "2026-2027"},
        {"grade": "Class 9", "section": "B", "data_source": RICH_DATA_SOURCE},
    )
    class_9a.homeroom_teacher_id = teacher.id
    class_9b.homeroom_teacher_id = priya.id

    # Enroll Aanya Sharma in Class 9-A
    _get_or_create(
        Enrollment,
        {"student_id": student_demo.id, "class_id": class_9a.id},
        {"status": "active"},
    )

    # Classmates across 9-A and 9-B
    peer_specs = [
        ("rohan.verma@demo.com", "2026-09A-02", "Rohan Verma", class_9a),
        ("meera.iyer@demo.com", "2026-09A-03", "Meera Iyer", class_9a),
        ("kabir.singh@demo.com", "2026-09A-04", "Kabir Singh", class_9a),
        ("ishita.rao@demo.com", "2026-09A-05", "Ishita Rao", class_9a),
        ("ananya.gupta@demo.com", "2026-09A-06", "Ananya Gupta", class_9a),
        ("arjun.mehta@demo.com", "2026-09A-07", "Arjun Mehta", class_9a),
        ("aditya.kapoor@demo.com", "2026-09B-01", "Aditya Kapoor", class_9b),
        ("diya.patel@demo.com", "2026-09B-02", "Diya Patel", class_9b),
        ("vivaan.nair@demo.com", "2026-09B-03", "Vivaan Nair", class_9b),
        ("sara.khan@demo.com", "2026-09B-04", "Sara Khan", class_9b),
    ]
    classmates = []
    for p_email, p_pid, p_name, target_cls in peer_specs:
        peer_u, _ = _ensure_demo_user(p_email, p_pid, p_name, roles["student"], pw_hash, data_source="ui_demo")
        _get_or_create(
            Enrollment,
            {"student_id": peer_u.id, "class_id": target_cls.id},
            {"status": "active"},
        )
        classmates.append(peer_u)

    # 4. Subject Catalog
    subjects_by_code = {}
    for s_spec in SUBJECT_SPECS:
        subj = Subject.query.filter_by(code=s_spec["code"]).first()
        if not subj:
            subj = Subject(
                code=s_spec["code"],
                name=s_spec["name"],
                description=s_spec["description"],
                category=s_spec["category"],
                curriculum_label=s_spec["curriculum_label"],
                status=s_spec["status"],
                badge_label=s_spec["badge_label"],
                icon=s_spec["icon"],
                data_source=RICH_DATA_SOURCE,
            )
            db.session.add(subj)
            db.session.flush()
        else:
            subj.name = s_spec["name"]
            subj.description = s_spec["description"]
            subj.category = s_spec["category"]
            subj.curriculum_label = s_spec["curriculum_label"]
            subj.status = s_spec["status"]
            subj.badge_label = s_spec["badge_label"]
            subj.icon = s_spec["icon"]
        subjects_by_code[s_spec["code"]] = subj

    math_subject = subjects_by_code["MATH-9-UI"]
    sci_subject = subjects_by_code["SCI-9-UI"]

    # Ensure Science has introductory topics so multi-subject views have real records
    for s_idx, (s_title, s_desc) in enumerate(
        [
            ("Matter in Our Surroundings", "States of matter, evaporation, and physical properties."),
            ("The Fundamental Unit of Life", "Prokaryotic and eukaryotic cell structure and organelles."),
            ("Motion & Laws of Motion", "Velocity, acceleration, Newton's three laws, and momentum."),
        ],
        start=1,
    ):
        _get_or_create(
            Topic,
            {"subject_id": sci_subject.id, "title": s_title},
            {"description": s_desc, "unit_name": "NCERT Science", "order_index": s_idx, "is_pilot": False},
        )

    # Assign teacher Alex Rivera to Class 9-A & 9-B Math and Class 9-A Science
    for cls_obj, sub_obj in ((class_9a, math_subject), (class_9b, math_subject), (class_9a, sci_subject)):
        ta, _ = _get_or_create(
            TeacherAssignment,
            {"teacher_id": teacher.id, "class_id": cls_obj.id, "subject_id": sub_obj.id},
            {"is_active": True},
        )
        ta.is_active = True

    # 5. Error Tags
    error_tags_map = {}
    for et_name, et_desc in (
        ("sign_error", "A sign was changed or reversed incorrectly when transposing or expanding."),
        ("denominator_operation_error", "Fraction denominators were added or subtracted without a common multiple."),
        ("incorrect_transposition", "A term was moved across an equality sign incorrectly."),
        ("formula_confusion", "An incorrect formula, axiom, or theorem was applied."),
        ("arithmetic_slip", "A basic numeric calculation step appears inconsistent."),
    ):
        et, _ = _get_or_create(ErrorTag, {"name": et_name}, {"description": et_desc})
        error_tags_map[et_name] = et

    # 6. Full Math Curriculum, Questions, Assessments & Baseline Intelligence
    topic_by_title = _ensure_math_curriculum(math_subject, teacher, admin, error_tags_map)
    assessments_by_topic = _ensure_assessments_for_class(class_9a, math_subject, topic_by_title, teacher)
    _seed_student_baseline_evidence(
        student_demo,
        classmates,
        teacher,
        class_9a,
        math_subject,
        topic_by_title,
        assessments_by_topic,
        error_tags_map,
    )

    # 7. Engagement Tables for `student@demo.com` (and Classmates)
    # 7a. Bookmarks
    for bm_sub in (math_subject, sci_subject):
        _get_or_create(SubjectBookmark, {"user_id": student_demo.id, "subject_id": bm_sub.id})

    # 7b. Resource Views (reviewed resources in Fractions & Number Systems)
    for res_title_topic in ("Fractions", "Number Systems"):
        t_obj = topic_by_title.get(res_title_topic)
        if t_obj:
            for r in Resource.query.filter_by(topic_id=t_obj.id).limit(2).all():
                _get_or_create(
                    ResourceView,
                    {"student_id": student_demo.id, "resource_id": r.id},
                    {"duration_seconds": 480, "reviewed_at": now - timedelta(days=10)},
                )

    # 7c. Student Dashboard Tasks
    if StudentTask.query.filter_by(student_id=student_demo.id).count() == 0:
        db.session.add_all(
            [
                StudentTask(
                    student_id=student_demo.id,
                    title="Linear equations transposition revision",
                    is_done=False,
                    due_date=now + timedelta(days=2),
                ),
                StudentTask(
                    student_id=student_demo.id,
                    title="Fractions common denominator drill",
                    is_done=True,
                    completed_at=now - timedelta(days=14),
                ),
                StudentTask(
                    student_id=student_demo.id,
                    title="Polynomials Factor Theorem check",
                    is_done=True,
                    completed_at=now - timedelta(days=7),
                ),
                StudentTask(
                    student_id=student_demo.id,
                    title="Coordinate Geometry quadrant workbook review",
                    is_done=False,
                    due_date=now + timedelta(days=4),
                ),
            ]
        )

    # 7d. Study Sessions (8-week spread + classmates today for RealTimeActivity)
    if StudySession.query.filter_by(user_id=student_demo.id).count() == 0:
        session_defs = [
            ("Polynomials Exercise 2.4 Factorisation", "practice", "Polynomials", 55, 85.0, "web", "evening", 1),
            ("Algebraic Identities Guided Video", "video", "Polynomials", 35, None, "mobile", "afternoon", 2),
            ("Linear Equations Two-Step Drill", "quiz", "Linear Equations", 45, 70.0, "web", "evening", 3),
            ("Sign Laws Remediation Walkthrough", "resource", "Linear Equations", 30, None, "web", "morning", 4),
            ("Fractions Reassessment Verification", "quiz", "Fractions", 40, 100.0, "web", "evening", 7),
            ("Number Systems Rationalisation Practice", "practice", "Number Systems", 50, 88.0, "mobile", "evening", 10),
            ("Coordinate Geometry Plotting Drill", "assignment", "Coordinate Geometry", 38, 82.0, "web", "afternoon", 14),
            ("Statistics Frequency Histogram Review", "practice", "Statistics", 42, 76.0, "web", "evening", 21),
            ("Number Systems Laws of Exponents", "quiz", "Number Systems", 48, 90.0, "web", "evening", 28),
            ("Fractions Diagnostic Pre-Test", "quiz", "Fractions", 35, 38.0, "web", "morning", 35),
        ]
        for s_title, a_type, t_name, mins, s_pct, plat, slot, d_ago in session_defs:
            t_obj = topic_by_title.get(t_name)
            st_time = now - timedelta(days=d_ago)
            db.session.add(
                StudySession(
                    user_id=student_demo.id,
                    subject_id=math_subject.id,
                    topic_id=t_obj.id if t_obj else None,
                    activity_type=a_type,
                    title=s_title,
                    duration_minutes=mins,
                    score_percentage=s_pct,
                    platform=plat,
                    time_slot=slot,
                    started_at=st_time,
                    ended_at=st_time + timedelta(minutes=mins),
                )
            )

    # Today's active study sessions for classmates (RealTimeActivityPage live monitoring)
    today_peers = [
        ("rohan.verma@demo.com", "resource", "Fraction Strips Visual Demonstration", 24, 60.0, "Fractions"),
        ("meera.iyer@demo.com", "quiz", "Polynomials Factorisation Diagnostic Check", 45, 100.0, "Polynomials"),
        ("ishita.rao@demo.com", "practice", "Advanced Exponents Practice Set", 52, 94.0, "Number Systems"),
        ("ananya.gupta@demo.com", "video", "Cartesian Plane Point Plotting Workshop", 40, 90.0, "Coordinate Geometry"),
        ("aditya.kapoor@demo.com", "assignment", "Linear Equations Standard Form Worksheet", 28, 75.0, "Linear Equations"),
        ("vivaan.nair@demo.com", "video", "Transposition Sign Balancing Walkthrough", 19, 50.0, "Linear Equations"),
    ]
    for p_email, p_type, p_title, p_mins, p_score, p_topic in today_peers:
        p_user = User.query.filter_by(email=p_email).first()
        if p_user and StudySession.query.filter_by(user_id=p_user.id).count() == 0:
            t_obj = topic_by_title.get(p_topic)
            db.session.add(
                StudySession(
                    user_id=p_user.id,
                    subject_id=math_subject.id,
                    topic_id=t_obj.id if t_obj else None,
                    activity_type=p_type,
                    title=p_title,
                    duration_minutes=p_mins,
                    score_percentage=p_score,
                    platform="web",
                    time_slot="afternoon",
                    started_at=now - timedelta(minutes=p_mins + 15),
                    ended_at=now - timedelta(minutes=15),
                )
            )

    # 7e. Daily Activity Heatmap Rollups (past 90 days for `student@demo.com` + recent 14 days for peers)
    if StudentDailyActivity.query.filter_by(student_id=student_demo.id).count() == 0:
        pilot_topic_objs = [
            topic_by_title[t]
            for t in ("Fractions", "Number Systems", "Polynomials", "Linear Equations", "Statistics")
            if t in topic_by_title
        ]
        # Guarantee a continuous 12-day active streak ending today
        for day_offset in range(0, 120):
            act_day = today - timedelta(days=day_offset)
            # Active streak on days 0..11, then ~65% study cadence for older weeks
            is_active_day = day_offset < 12 or (day_offset % 3 != 1)
            if not is_active_day:
                continue
            q_ans = 6 + ((day_offset * 5) % 14)
            c_cnt = max(3, int(q_ans * (0.68 + ((day_offset % 4) * 0.07))))
            t_obj = pilot_topic_objs[day_offset % len(pilot_topic_objs)] if pilot_topic_objs else None
            db.session.add(
                StudentDailyActivity(
                    student_id=student_demo.id,
                    activity_date=act_day,
                    questions_answered=q_ans,
                    correct_count=min(q_ans, c_cnt),
                    tasks_completed=1 + (day_offset % 3),
                    active_minutes=20 + ((day_offset * 7) % 50),
                    primary_topic_id=t_obj.id if t_obj else None,
                )
            )

    for p_idx, peer in enumerate(classmates):
        if StudentDailyActivity.query.filter_by(student_id=peer.id).count() == 0:
            for d_off in range(1, 15):
                if (p_idx + d_off) % 3 == 0:
                    continue
                db.session.add(
                    StudentDailyActivity(
                        student_id=peer.id,
                        activity_date=today - timedelta(days=d_off),
                        questions_answered=5 + (d_off % 8),
                        correct_count=4 + (d_off % 5),
                        tasks_completed=1 + (d_off % 2),
                        active_minutes=18 + ((p_idx * 4 + d_off) % 30),
                        primary_topic_id=topic_by_title["Polynomials"].id if "Polynomials" in topic_by_title else None,
                    )
                )

    # 7f. Attendance Records (25 days -> Aanya Sharma 23/25 = 92%)
    if AttendanceRecord.query.filter_by(student_id=student_demo.id).count() == 0:
        for d_off in range(0, 25):
            att_date = today - timedelta(days=d_off)
            status_val = "absent" if d_off in (9, 17) else "present"
            db.session.add(
                AttendanceRecord(
                    student_id=student_demo.id,
                    class_id=class_9a.id,
                    attendance_date=att_date,
                    status=status_val,
                    recorded_by=teacher.id,
                )
            )
    for peer in classmates:
        peer_cls_id = peer.enrollments[0].class_id if peer.enrollments else class_9a.id
        if AttendanceRecord.query.filter_by(student_id=peer.id).count() == 0:
            is_absent_today = peer.email in ("kabir.singh@demo.com", "diya.patel@demo.com", "arjun.mehta@demo.com")
            for d_off in range(0, 10):
                st_val = "absent" if (d_off == 0 and is_absent_today) else "present"
                db.session.add(
                    AttendanceRecord(
                        student_id=peer.id,
                        class_id=peer_cls_id,
                        attendance_date=today - timedelta(days=d_off),
                        status=st_val,
                        recorded_by=teacher.id,
                    )
                )

    # 7g. Class Events & Class Announcement
    if ClassEvent.query.filter_by(class_id=class_9a.id).count() == 0:
        db.session.add_all(
            [
                ClassEvent(
                    class_id=class_9a.id,
                    subject_id=math_subject.id,
                    teacher_id=teacher.id,
                    title="Sign error patterns in 2-step equations",
                    event_type="lesson",
                    topic_label="Linear Equations",
                    scheduled_at=now + timedelta(hours=2),
                    time_label="09:00 AM",
                ),
                ClassEvent(
                    class_id=class_9a.id,
                    subject_id=math_subject.id,
                    teacher_id=priya.id,
                    title="Polynomial factorization practice workshop",
                    event_type="workshop",
                    topic_label="Polynomials",
                    scheduled_at=now + timedelta(hours=5),
                    time_label="11:00 AM",
                ),
                ClassEvent(
                    class_id=class_9a.id,
                    subject_id=math_subject.id,
                    teacher_id=teacher.id,
                    title="Math Doubt Clinic & Remediation Window",
                    event_type="clinic",
                    topic_label="Linear Equations",
                    scheduled_at=now + timedelta(days=2),
                    time_label="Friday, 11:00 AM",
                ),
                ClassEvent(
                    class_id=class_9a.id,
                    subject_id=math_subject.id,
                    teacher_id=teacher.id,
                    title="Weekly Mathematics Reassessment",
                    event_type="reassessment",
                    topic_label="Class 9 Core",
                    scheduled_at=now + timedelta(days=3),
                    time_label="Saturday, 5:00 PM",
                ),
            ]
        )

    if ClassAnnouncement.query.filter_by(class_id=class_9a.id).count() == 0:
        db.session.add(
            ClassAnnouncement(
                class_id=class_9a.id,
                teacher_id=teacher.id,
                message=(
                    "Hey Class 9-A! The mid-term diagnostic review across Mathematics is active. "
                    "Please review your teacher feedback notes and complete Practice Set LE-02 before Friday!"
                ),
                is_active=True,
            )
        )

    # 7h. Teacher Feedback Comments (for StudentDetailPage & ReportCard Feedback Tab)
    if TeacherFeedback.query.filter_by(student_id=student_demo.id).count() == 0:
        db.session.add_all(
            [
                TeacherFeedback(
                    student_id=student_demo.id,
                    teacher_id=teacher.id,
                    class_id=class_9a.id,
                    subject_id=math_subject.id,
                    comment_text=(
                        "Aanya is an enthusiastic and diligent learner. Her fraction operations and polynomials work "
                        "improved significantly (+46% mastery delta after reassessment). Continuing to apply inverse "
                        "operations carefully before division will resolve remaining sign slips in Linear Equations."
                    ),
                    tags_json=["Algebra Focus", "High Diligence", "Strong Learning Gain"],
                    created_at=now - timedelta(days=2),
                ),
                TeacherFeedback(
                    student_id=student_demo.id,
                    teacher_id=priya.id,
                    class_id=class_9a.id,
                    subject_id=sci_subject.id,
                    comment_text=(
                        "Shows commendable attendance (92%) and continuous 12-day practice streak. Proactive in peer "
                        "workshops and analytical diagnostics."
                    ),
                    tags_json=["92% Attendance", "Consistent Practice"],
                    created_at=now - timedelta(days=6),
                ),
            ]
        )

    # 7i. Achievement Definitions & Demo Student Earned Badges
    ach_objs = {}
    for a_spec in ACHIEVEMENT_CATALOG:
        ach_obj, _ = _get_or_create(Achievement, {"code": a_spec["code"]}, a_spec)
        ach_objs[a_spec["code"]] = ach_obj

    for earn_code, d_ago in (
        ("first_diagnostic", 28),
        ("fractions_mastery", 14),
        ("streak_12_days", 1),
        ("problem_solver_month", 5),
        ("cohort_merit", 3),
    ):
        _get_or_create(
            StudentAchievement,
            {"student_id": student_demo.id, "achievement_id": ach_objs[earn_code].id},
            {"awarded_at": now - timedelta(days=d_ago), "metadata_json": {"source": "pilot_milestone"}},
        )

    # 7j. Sample Teacher Reminders
    if StudentReminder.query.filter_by(recipient_user_id=student_demo.id).count() == 0:
        db.session.add(
            StudentReminder(
                recipient_user_id=student_demo.id,
                sender_user_id=teacher.id,
                class_id=class_9a.id,
                title="Linear Equations Reassessment Ready",
                message="Review the sign-error walkthrough note and attempt Linear Equations Practice Quiz when ready.",
                reminder_type="reassessment",
                is_read=False,
            )
        )

    # 7k. Multi-term Traditional & Analytics Reports for `student@demo.com`
    from app.services.report_service import ReportService

    db.session.commit()
    for term in ("Unit Test 1", "Unit Test 2", "Half Yearly", "Term 1"):
        existing_rep = Report.query.filter_by(
            student_id=student_demo.id,
            subject_id=math_subject.id,
            term_label=term,
        ).first()
        if not existing_rep:
            ReportService.generate_student_report(
                actor_id=teacher.id,
                actor_role="teacher",
                student_id=student_demo.id,
                subject_id=math_subject.id,
                term_label=term,
            )

    db.session.commit()
    return {
        "demo_users": ["admin@demo.com", "teacher@demo.com", "student@demo.com"],
        "classmates": len(classmates),
        "subjects": len(subjects_by_code),
        "math_topics": len(topic_by_title),
        "achievements_awarded": StudentAchievement.query.filter_by(student_id=student_demo.id).count(),
        "daily_activity_days": StudentDailyActivity.query.filter_by(student_id=student_demo.id).count(),
        "study_sessions": StudySession.query.filter_by(user_id=student_demo.id).count(),
    }


@click.command("seed-rich-demo")
@click.option(
    "--password",
    default="demo1234",
    help="Password for the real demo accounts (admin@demo.com, teacher@demo.com, student@demo.com).",
)
@click.option(
    "--skip-if-seeded",
    is_flag=True,
    default=False,
    help="Exit immediately without scanning tables if student@demo.com already exists.",
)
def seed_rich_demo_command(password, skip_if_seeded):
    """Populate real database records for demo accounts while keeping new registrations clean."""
    if skip_if_seeded and User.query.filter_by(email="student@demo.com").first():
        click.echo("Rich demo data already present; skipping seed.")
        return
    summary = seed_rich_demo_accounts(password=password)
    click.echo(
        "Rich demo data ready in DB: "
        f"subjects={summary['subjects']}, math_topics={summary['math_topics']}, "
        f"classmates={summary['classmates']}, daily_activity_days={summary['daily_activity_days']}, "
        f"study_sessions={summary['study_sessions']}, achievements={summary['achievements_awarded']}."
    )
