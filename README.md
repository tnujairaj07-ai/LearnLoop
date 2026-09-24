# LearnLoop Backend

> **An explainable closed-loop learning intelligence platform.**

LearnLoop converts classroom assessment evidence into actionable student next steps, targeted practice sets, teacher interventions, reassessment, and measurable learning gains.

The platform continuously drives the closed-loop learning cycle:

$$\text{Assess} \longrightarrow \text{Diagnose} \longrightarrow \text{Recommend} \longrightarrow \text{Practice} \longrightarrow \text{Reassess} \longrightarrow \text{Measure Improvement} \longrightarrow \text{Guide the Teacher} \longrightarrow \text{Report Retrieval}$$

---

## Key Questions Answered

| Persona | Core Question | Answered By |
|---|---|---|
| **Student** | *What should I learn next?* | Actionable, multi-step practice recommendations and transparent mastery cards |
| **Teacher** | *Who needs help, and with what?* | Class dashboard, curriculum heatmaps, item distractor analysis, and intervention proposals |
| **Coordinator / Admin** | *Is learning actually improving?* | Hake's normalized learning gain ($g$), pre/post comparative analytics, and report cards |

---

## Current Status

- **Backend Roadmap**: All 8 Phases Complete (Phases 1–8).
- **Test Suite**: **60 / 60 automated tests passing** (100% pass rate) across unit, API, integration, security, and full end-to-end closed-loop pilot acceptance tests.
- **Database**: MySQL 8.0+ with Alembic migrations (`Flask-Migrate`), foreign-key constraints, check constraints, and indexed lookups.
- **Continuous Integration**: GitHub Actions CI workflow (`.github/workflows/ci.yml`) with automated MySQL service containers, migration verification, and pytest execution.

---

## Core Learning Intelligence Models

### 1. Explainable Heuristic Mastery Model
Rather than a black-box machine learning model, LearnLoop calculates an interpretable, transparent heuristic mastery score ($0\text{--}100$) decomposed into four explicit components:

$$\text{Mastery} = 0.40 \times \text{Accuracy} + 0.20 \times \text{Difficulty} + 0.20 \times \text{Recency} + 0.20 \times \text{Trend}$$

- **Accuracy Component ($40\%$)**: Ratio of correct questions across attempts in the topic.
- **Difficulty Component ($20\%$)**: Scaled weight based on question difficulty tiers ($1 = \text{easy}, 2 = \text{medium}, 3 = \text{hard}$).
- **Recency Component ($20\%$)**: Exponential time-decay ($e^{-0.05 \times \Delta t_{\text{days}}}$) prioritizing recent student performance over stale attempts.
- **Trend Component ($20\%$)**: Historical trajectory comparing the student's second-half vs. first-half accuracy ($50 + \frac{\Delta \text{acc}}{2}$).

#### Constructive Mastery Bands (Non-Stigmatizing)
| Score Range | Pedagogical Label | Default System Action |
|:---:|---|---|
| **$0\text{--}39$** | Needs strong support | Remedial worked examples, fundamental notes, and easy practice sets |
| **$40\text{--}59$** | Developing | Targeted skill practice, guided problems, and misconception remediation |
| **$60\text{--}79$** | Proficient | Medium-difficulty practice and eligibility for reassessment |
| **$80\text{--}100$** | Secure | Advanced curriculum practice or progression to the next topic |

---

### 2. Recurrent Misconception & Error-Pattern Detection
- Questions and distractors are tagged with instructional misconception codes (e.g., `denominator_operation_error`, `sign_error`, `formula_confusion`).
- **Threshold**: An error pattern is only flagged as `suspected` when observed at least **2 times** ($\ge 2$), eliminating false-positive flags from isolated slips.
- **Teacher-in-the-Loop Oversight**: Teachers can confirm, dismiss, or override suspected misconception flags, creating an immutable audit trail in `ErrorPatternReview`.

---

### 3. Actionable Multi-Step Recommendations
Recommendations provide concrete, sequential actions:
- Remedial study resources (worked examples, reference notes).
- Adaptive Level 1 & Level 2 practice assessments.
- Post-intervention reassessment testing.
- Automatic completion tracking when practice actions are completed.

---

### 4. Impact Measurement: Hake's Normalized Learning Gain
When a teacher completes an intervention linked to a post-reassessment test, LearnLoop calculates Hake's normalized learning gain ($g$):

$$g = \frac{\text{Post-test Score} - \text{Pre-test Score}}{100 - \text{Pre-test Score}}$$

- **Strong Improvement**: $g \ge 0.70$
- **Moderate Improvement**: $0.30 \le g < 0.70$
- **Minimal / No Change**: $0.0 \le g < 0.30$
- **Needs Further Support**: $g < 0.0$

---

### 5. Traditional & Explainable Analytics Report Cards
- **Traditional Report**: Overall accuracy percentage, total assessments completed, practice sessions completed, topic grades, and constructive teacher remarks.
- **Analytics Report**: 4-part mastery decomposition, Hake normalized learning gain history, recurrent misconception summaries, completed teacher interventions, and actionable next steps.
- **Class Aggregated Report**: Whole-class mastery distributions, topic-by-topic heatmaps, high-frequency misconception clusters, and average learning gain impact.

---

## Tech Stack

- **Runtime**: Python 3.11 / 3.12 / 3.14
- **Web Framework**: Flask (Application Factory & Blueprints)
- **Database**: MySQL 8.0+
- **ORM & Migrations**: SQLAlchemy & Flask-Migrate (Alembic)
- **Authentication**: Flask-JWT-Extended (with token blacklisting / revocation)
- **Security & Password Hashing**: Werkzeug Security (`scrypt` / `pbkdf2`)
- **Testing**: Pytest & pytest-mock
- **CORS**: Flask-CORS (domain-scoped)

---

## Project Structure

```text
LearnLoop/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy Database Models
│   │   │   ├── academic.py    # Subject, Topic, Skill, Prerequisite, Resource
│   │   │   ├── assessment.py  # Assessment, Question, AssessmentQuestion, Attempt, Answer
│   │   │   ├── content.py     # Question, Option, ErrorTag, QuestionErrorTag
│   │   │   ├── governance.py  # LearningGainRecord, Report, AuditLog
│   │   │   ├── intervention.py# Intervention, InterventionStudent, ErrorPatternFlag, ErrorPatternReview
│   │   │   ├── mastery.py     # MasteryRecord, Recommendation, RecommendationAction
│   │   │   └── user.py        # User, Role, Class, Enrollment, TeacherAssignment, TokenBlocklist
│   │   ├── routes/            # Blueprint Route Controllers
│   │   │   ├── admin_routes.py       # /api/admin
│   │   │   ├── assessment_routes.py  # /api/assessments, /api/attempts
│   │   │   ├── auth_routes.py        # /api/auth
│   │   │   ├── content_routes.py     # /api/content
│   │   │   ├── health_routes.py      # /api/health
│   │   │   ├── report_routes.py      # /api/reports
│   │   │   ├── student_routes.py     # /api/student
│   │   │   └── teacher_routes.py     # /api/teacher
│   │   ├── services/          # Pure Service Business Logic
│   │   │   ├── academic_admin_service.py # Classes, enrolments, assignments
│   │   │   ├── analytics_service.py      # Aggregations, dashboards, heatmaps
│   │   │   ├── assessment_service.py     # Attempts, autosave, anti-tampering
│   │   │   ├── audit_service.py          # Immutable sanitized audit logs
│   │   │   ├── auth_service.py           # Login, JWT, profile, revocation
│   │   │   ├── content_service.py        # Curriculum, questions, distractor tags
│   │   │   ├── error_pattern_service.py  # Misconception threshold detection
│   │   │   ├── intervention_service.py   # Intervention lifecycle & Hake gains
│   │   │   ├── mastery_service.py        # Explainable heuristic mastery engine
│   │   │   ├── recommendation_service.py # Multi-step student actions
│   │   │   ├── report_service.py         # Traditional & analytics reports
│   │   │   └── scoring_service.py        # Deterministic auto-scoring
│   │   ├── seed/              # Synthetic Pilot Dataset Seed & Reset CLI
│   │   ├── utils/             # Response envelopes, error handlers, JWT guards
│   │   ├── config.py          # Environment configuration classes
│   │   └── extensions.py      # SQLAlchemy, Migrate, JWT, CORS singletons
│   ├── migrations/            # Alembic schema version migrations
│   ├── tests/                 # Comprehensive Pytest Suite (60 tests)
│   ├── run.py                 # Application entry point
│   ├── requirements.txt       # Production dependencies
│   └── .env.example           # Environment template
└── .github/
    └── workflows/
        └── ci.yml             # GitHub Actions CI workflow
```

---

## API Endpoints Reference

All API routes return consistent JSON response envelopes:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable message or null",
  "errors": []
}
```

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates user; returns JWT access & refresh tokens |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated profile & role |
| `POST` | `/api/auth/logout` | Authenticated | Revokes current JWT token into `TokenBlocklist` |
| `POST` | `/api/auth/refresh` | Authenticated | Generates fresh access token from refresh token |

### Curriculum & Content (`/api/content`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/content/subjects` | Authenticated | Lists all active academic subjects |
| `GET` | `/api/content/topics/<id>` | Authenticated | Returns topic skills, prerequisites, and resources |
| `GET` | `/api/content/questions` | Authenticated | Lists questions (strips correct answers & tags for students) |
| `POST` | `/api/content/questions` | Teacher, Admin | Authors a new question with distractors and error tags |

### Assessment & Attempts (`/api/assessments`, `/api/attempts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/assessments` | Authenticated | Lists assessments (role-filtered; student-safe) |
| `POST` | `/api/assessments` | Teacher, Admin | Creates a diagnostic, practice, or reassessment |
| `POST` | `/api/assessments/<id>/start` | Student | Starts or resumes an attempt idempotently |
| `POST` | `/api/attempts/<id>/answers` | Student | Autosaves/upserts student response with time spent |
| `POST` | `/api/attempts/<id>/submit` | Student | Finalizes attempt, locks answers, scores, and triggers intelligence |
| `GET` | `/api/attempts/<id>/result` | Student, Teacher | Returns detailed scored result and error analysis |

### Student Cockpit (`/api/student`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/student/dashboard` | Student | Summary metrics: average mastery, bands, active recommendations |
| `GET` | `/api/student/mastery/cards` | Student | Decomposed explainable mastery cards for each topic |
| `GET` | `/api/student/mastery/trajectory`| Student | Historical growth and mastery timeline |
| `GET` | `/api/student/recommendations` | Student | Active recommended learning actions with completion state |
| `POST` | `/api/student/actions/<id>/complete` | Student | Marks a recommendation action (e.g. read note) complete |
| `GET` | `/api/student/reports/<term_label>` | Student | Retrieves personal Traditional & Analytics Report Card |

### Teacher Cockpit (`/api/teacher`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/teacher/classes` | Teacher, Admin | Lists classes and subjects assigned to the teacher |
| `GET` | `/api/teacher/classes/<id>/dashboard` | Teacher, Admin | Class mastery average, band distribution, active alerts |
| `GET` | `/api/teacher/classes/<id>/matrix` | Teacher, Admin | Whole-class curriculum mastery heatmap |
| `GET` | `/api/teacher/classes/<id>/students` | Teacher, Admin | Student diagnostic roster with non-stigmatizing support categories |
| `GET` | `/api/teacher/assessments/<id>/item-analysis` | Teacher, Admin | Question accuracy and distractor distribution breakdown |
| `GET` | `/api/teacher/classes/<id>/error-patterns` | Teacher, Admin | Class-level recurrent misconception flags and affected students |
| `POST` | `/api/teacher/error-patterns/<id>/review` | Teacher, Admin | Confirm, dismiss, or override a student misconception flag |
| `GET` | `/api/teacher/interventions` | Teacher, Admin | Lists suggested and active interventions |
| `POST` | `/api/teacher/interventions` | Teacher, Admin | Creates a structured intervention proposal |
| `POST` | `/api/teacher/interventions/<id>/assign` | Teacher, Admin | Assigns intervention to students and records baseline |
| `POST` | `/api/teacher/interventions/<id>/complete` | Teacher, Admin | Links reassessment, evaluates learning gain ($g$), and completes |

### Reports & Governance (`/api/reports`, `/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/reports/student/<id>/generate` | Teacher, Admin | Generates/regenerates a student Traditional & Analytics Report |
| `GET` | `/api/reports/student/<id>/<term_label>` | Student (Self), Assigned Teacher, Admin | Retrieves student report card |
| `POST` | `/api/reports/class/<id>/generate` | Assigned Teacher, Admin | Generates class aggregated report card |
| `GET` | `/api/reports/class/<id>/<term_label>` | Assigned Teacher, Admin | Retrieves class aggregated report card |
| `GET` | `/api/admin/audit-logs` | Admin | Filterable inspection of immutable audit log records |
| `DELETE`| `/api/admin/users/<id>/privacy-purge` | Admin | Anonymizes student PII while preserving academic analytics |

---

## Local Setup & Installation

### 1. Prerequisites
- Python 3.11+
- MySQL Server 8.0+ running locally (default: `127.0.0.1:3306`)

### 2. Virtual Environment Setup

**Windows PowerShell:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

Configure your local MySQL credentials in `.env`:
```env
FLASK_ENV=development
SECRET_KEY=dev_secret_key_change_in_production
JWT_SECRET_KEY=jwt_secret_key_change_in_production
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@127.0.0.1:3306/learnloop_db
FRONTEND_URL=http://localhost:5173
```

### 5. Create Database & Apply Migrations
Create the MySQL database:
```sql
CREATE DATABASE learnloop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Apply database migrations:
```powershell
python -m flask --app run.py db upgrade
```

### 6. Seed Synthetic Pilot Dataset
Populate the database with the Class 9 Mathematics pilot dataset:
```powershell
python -m flask --app run.py seed-demo --password DemoPass123!
```

*To reset or delete synthetic demo records cleanly:*
```powershell
python -m flask --app run.py reset-demo --confirm
```

### 7. Run the Application
```powershell
python run.py
```
Backend API will start on: `http://127.0.0.1:5000`

---

## Synthetic Pilot Accounts

When seeded using `flask seed-demo --password DemoPass123!`:

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Demo Admin | `admin@learnloop.demo` | `DemoPass123!` |
| **Teacher** | Demo Teacher | `teacher@learnloop.demo` | `DemoPass123!` |
| **Student** | Student A | `student.a@learnloop.demo` | `DemoPass123!` |
| **Student** | Student B | `student.b@learnloop.demo` | `DemoPass123!` |
| **Students** | Demo Students 03–20 | `student.03@learnloop.demo` ... `student.20@learnloop.demo` | `DemoPass123!` |

---

## Testing & Verification

The backend includes a comprehensive automated test suite covering unit tests, API tests, role-based authorization guards, and the complete closed-loop pilot acceptance test:

```powershell
# Run the entire test suite (60 tests)
pytest -v

# Run only the end-to-end closed loop acceptance test
pytest tests/test_acceptance_e2e.py -v

# Run individual test modules
pytest tests/test_reports.py -v
pytest tests/test_teacher.py -v
pytest tests/test_intelligence.py -v
pytest tests/test_assessment.py -v
pytest tests/test_auth.py -v
```

---

## Security, Privacy, and Governance

- **Password Hashing**: Stored using secure Werkzeug password hashing.
- **Strict Role-Based Access Control**:
  - Students cannot access teacher or admin routes.
  - Students cannot access another student's attempts, results, or report cards (`403 Forbidden`).
  - Teachers cannot view or modify data for classes they are not assigned to (`403 Forbidden`).
- **Student Data Safety**: Unsubmitted questions stripped of correct answers, explanations, hints, and error tags.
- **Immutable Audit Trail**: Sensitive operations (submissions, intelligence calculations, reviews, interventions, purges) recorded in `AuditLog` with strict PII redaction.
- **Privacy Purge**: Dedicated admin endpoint to scrub student PII in compliance with educational data privacy regulations (FERPA/COPPA).