from datetime import datetime
import re
import secrets
import uuid

from sqlalchemy import text
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.academic import Subject, Topic
from app.models.assessment import Assessment, Attempt
from app.models.content import Question
from app.models.engagement import StudentDailyActivity, StudySession
from app.models.governance import AuditLog, Report
from app.models.intervention import Intervention
from app.models.mastery import MasteryRecord
from app.models.system_status import SystemStatus
from app.models.user import Class, Enrollment, Role, TeacherAssignment, User


_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AcademicAdminService:
    @staticmethod
    def get_classes():
        """Retrieve all classes with enrollment counts."""
        classes = Class.query.order_by(Class.grade.asc(), Class.section.asc()).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "grade": c.grade,
                "section": c.section,
                "academic_year": c.academic_year,
                "homeroom_teacher_id": c.homeroom_teacher_id,
                "homeroom_teacher_name": c.homeroom_teacher.name if c.homeroom_teacher else None,
                "data_source": c.data_source,
                "student_count": len([e for e in c.enrollments if e.status == "active"]),
                "teacher_assignments_count": len([t for t in c.teacher_assignments if t.is_active]),
            }
            for c in classes
        ]

    @staticmethod
    def get_class_details(class_id):
        """Retrieve class details with enrolled students and teacher assignments."""
        classroom = db.session.get(Class, class_id)
        if not classroom:
            raise LookupError(f"Class with ID {class_id} not found.")

        students = [
            {
                "enrollment_id": e.id,
                "student_id": e.student.id,
                "public_id": e.student.public_id,
                "name": e.student.name,
                "email": e.student.email,
                "status": e.status,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            }
            for e in classroom.enrollments
            if e.student is not None
        ]

        teachers = [
            {
                "assignment_id": ta.id,
                "teacher_id": ta.teacher.id,
                "public_id": ta.teacher.public_id,
                "name": ta.teacher.name,
                "subject_id": ta.subject.id,
                "subject_name": ta.subject.name,
                "is_active": ta.is_active,
            }
            for ta in classroom.teacher_assignments
            if ta.teacher is not None and ta.subject is not None
        ]

        return {
            "id": classroom.id,
            "name": classroom.name,
            "grade": classroom.grade,
            "section": classroom.section,
            "academic_year": classroom.academic_year,
            "homeroom_teacher_id": classroom.homeroom_teacher_id,
            "homeroom_teacher_name": classroom.homeroom_teacher.name if classroom.homeroom_teacher else None,
            "students": students,
            "teachers": teachers,
        }

    @staticmethod
    def update_class(class_id, data):
        classroom = db.session.get(Class, class_id)
        if not classroom:
            raise LookupError(f"Class with ID {class_id} not found.")

        if "name" in data:
            name = (data.get("name") or "").strip()
            if not name:
                raise ValueError("Class name cannot be blank.")
            classroom.name = name
        if "grade" in data:
            grade = (data.get("grade") or "").strip()
            if not grade:
                raise ValueError("Grade cannot be blank.")
            classroom.grade = grade
        if "section" in data:
            section = (data.get("section") or "").strip()
            if not section:
                raise ValueError("Section cannot be blank.")
            classroom.section = section
        if "academic_year" in data:
            ay = (data.get("academic_year") or "").strip()
            if not ay:
                raise ValueError("Academic year cannot be blank.")
            classroom.academic_year = ay
        if "homeroom_teacher_id" in data:
            ht_id = data.get("homeroom_teacher_id")
            if ht_id is None:
                classroom.homeroom_teacher_id = None
            else:
                teacher = db.session.get(User, ht_id)
                if not teacher:
                    raise LookupError(f"Teacher with ID {ht_id} not found.")
                if not teacher.role or teacher.role.name != "teacher":
                    raise ValueError(f"User {ht_id} does not have the 'teacher' role.")
                classroom.homeroom_teacher_id = ht_id

        conflict = Class.query.filter(
            Class.name == classroom.name,
            Class.academic_year == classroom.academic_year,
            Class.id != class_id,
        ).first()
        if conflict:
            raise ValueError(f"Class '{classroom.name}' for '{classroom.academic_year}' already exists.")

        classroom.updated_at = datetime.utcnow()
        db.session.commit()
        return AcademicAdminService.get_class_details(classroom.id)

    @staticmethod
    def create_class(data):
        name = (data.get("name") or "").strip()
        grade = (data.get("grade") or "").strip()
        section = (data.get("section") or "").strip()
        academic_year = (data.get("academic_year") or "").strip()

        if not name:
            raise ValueError("Class name is required.")
        if not grade:
            raise ValueError("Grade is required.")
        if not section:
            raise ValueError("Section is required.")
        if not academic_year:
            raise ValueError("Academic year is required.")

        existing = Class.query.filter_by(name=name, academic_year=academic_year).first()
        if existing:
            raise ValueError(f"Class '{name}' for academic year '{academic_year}' already exists.")

        classroom = Class(name=name, grade=grade, section=section, academic_year=academic_year)
        db.session.add(classroom)
        db.session.commit()
        return AcademicAdminService.get_class_details(classroom.id)

    @staticmethod
    def enroll_student(class_id, student_id):
        classroom = db.session.get(Class, class_id)
        if not classroom:
            raise LookupError(f"Class with ID {class_id} not found.")

        student = db.session.get(User, student_id)
        if not student:
            raise LookupError(f"Student with ID {student_id} not found.")
        if student.role.name != "student":
            raise ValueError(f"User {student.id} does not have the 'student' role.")

        existing = Enrollment.query.filter_by(class_id=class_id, student_id=student_id).first()
        if existing:
            if existing.status != "active":
                existing.status = "active"
                db.session.commit()
                return {"id": existing.id, "class_id": class_id, "student_id": student_id, "status": "active"}
            raise ValueError(f"Student {student_id} is already enrolled in class {class_id}.")

        enrollment = Enrollment(class_id=class_id, student_id=student_id, status="active")
        db.session.add(enrollment)
        db.session.commit()

        try:
            from app.services.audit_service import AuditService
            AuditService.log_event(
                action="academic.enrolment",
                entity_type="Enrollment",
                entity_id=enrollment.id,
                metadata_json={
                    "class_id": class_id,
                    "student_id": student_id,
                },
                commit=True,
            )
        except Exception:
            pass

        return {"id": enrollment.id, "class_id": class_id, "student_id": student_id, "status": "active"}

    @staticmethod
    def assign_teacher(teacher_id, class_id, subject_id):
        teacher = db.session.get(User, teacher_id)
        if not teacher:
            raise LookupError(f"Teacher with ID {teacher_id} not found.")
        if teacher.role.name != "teacher":
            raise ValueError(f"User {teacher.id} does not have the 'teacher' role.")

        classroom = db.session.get(Class, class_id)
        if not classroom:
            raise LookupError(f"Class with ID {class_id} not found.")

        subject = db.session.get(Subject, subject_id)
        if not subject:
            raise LookupError(f"Subject with ID {subject_id} not found.")

        existing = TeacherAssignment.query.filter_by(
            teacher_id=teacher_id, class_id=class_id, subject_id=subject_id
        ).first()

        if existing:
            if not existing.is_active:
                existing.is_active = True
                db.session.commit()
                return {"id": existing.id, "teacher_id": teacher_id, "class_id": class_id, "subject_id": subject_id, "is_active": True}
            raise ValueError("This teacher assignment is already active.")

        assignment = TeacherAssignment(
            teacher_id=teacher_id, class_id=class_id, subject_id=subject_id, is_active=True
        )
        db.session.add(assignment)
        db.session.commit()
        return {"id": assignment.id, "teacher_id": teacher_id, "class_id": class_id, "subject_id": subject_id, "is_active": True}

    @staticmethod
    def list_teachers():
        """List all teacher users with active class assignment and homeroom counts."""
        teachers = (
            User.query.join(Role, User.role_id == Role.id)
            .filter(Role.name == "teacher")
            .order_by(User.name.asc())
            .all()
        )
        result = []
        for t in teachers:
            active_tas = [ta for ta in t.teacher_assignments if ta.is_active]
            class_ids = {ta.class_id for ta in active_tas}
            homerooms = [c.name for c in Class.query.filter_by(homeroom_teacher_id=t.id).all()]
            result.append({
                "id": t.id,
                "public_id": t.public_id,
                "name": t.name,
                "email": t.email,
                "is_active": t.is_active,
                "data_source": t.data_source,
                "class_count": len(class_ids),
                "assignments_count": len(active_tas),
                "homeroom_classes": homerooms,
            })
        return result

    @staticmethod
    def list_students():
        """List all student users with active class enrollments."""
        students = (
            User.query.join(Role, User.role_id == Role.id)
            .filter(Role.name == "student")
            .order_by(User.name.asc())
            .all()
        )
        result = []
        for s in students:
            active_enrolls = [
                {
                    "class_id": e.class_id,
                    "class_name": e.classroom.name if e.classroom else None,
                    "grade": e.classroom.grade if e.classroom else None,
                }
                for e in s.enrollments
                if e.status == "active" and e.classroom is not None
            ]
            result.append({
                "id": s.id,
                "public_id": s.public_id,
                "name": s.name,
                "email": s.email,
                "is_active": s.is_active,
                "data_source": s.data_source,
                "class_name": active_enrolls[0]["class_name"] if active_enrolls else None,
                "enrolled_classes": active_enrolls,
            })
        return result

    @staticmethod
    def create_user_by_admin(data, role_name="student", actor_id=None):
        """Create a teacher or student account cleanly via admin governance controls."""
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        class_id = data.get("class_id")

        if role_name not in ("student", "teacher"):
            raise ValueError("Admin user creation endpoint supports 'student' or 'teacher' roles.")
        if not name:
            raise ValueError("Name is required.")
        if not email or not _EMAIL_PATTERN.match(email):
            raise ValueError("A valid email address is required.")
        if User.query.filter(User.email.ilike(email)).first():
            raise FileExistsError("An account with this email already exists.")

        if password is not None:
            if not isinstance(password, str) or len(password) < 6:
                raise ValueError("Password must be at least 6 characters long.")
            raw_pw = password
        else:
            raw_pw = secrets.token_urlsafe(16)

        target_class = None
        if class_id is not None:
            if role_name != "student":
                raise ValueError("class_id enrollment applies only to student accounts.")
            target_class = db.session.get(Class, class_id)
            if not target_class:
                raise LookupError(f"Class with ID {class_id} not found.")

        role_obj = Role.query.filter_by(name=role_name).first()
        if not role_obj:
            role_obj = Role(name=role_name, description=f"{role_name.title()} account role.")
            db.session.add(role_obj)
            db.session.flush()

        prefix = "STU" if role_name == "student" else "TCH"
        public_id = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"
        while User.query.filter_by(public_id=public_id).first():
            public_id = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"

        user = User(
            public_id=public_id,
            name=name,
            email=email,
            password_hash=generate_password_hash(raw_pw),
            role_id=role_obj.id,
            is_active=True,
            data_source="admin_created",
        )
        db.session.add(user)
        db.session.flush()

        class_name = None
        if target_class:
            db.session.add(Enrollment(student_id=user.id, class_id=target_class.id, status="active"))
            class_name = target_class.name

        db.session.commit()

        try:
            from app.services.audit_service import AuditService
            AuditService.log_event(
                action=f"admin.create_{role_name}",
                entity_type="User",
                entity_id=user.id,
                actor_id=actor_id,
                metadata_json={"role": role_name, "class_id": class_id},
                commit=True,
            )
        except Exception:
            pass

        return {
            "id": user.id,
            "public_id": user.public_id,
            "name": user.name,
            "email": user.email,
            "role": role_name,
            "is_active": user.is_active,
            "class_name": class_name,
            "class_count": 0 if role_name == "teacher" else None,
        }

    @staticmethod
    def get_system_status():
        """Return live platform health, database row counts, and SystemStatus markers."""
        db_connected = True
        try:
            db.session.execute(text("SELECT 1"))
        except Exception:
            db_connected = False

        status_markers = [
            {"id": s.id, "name": s.name, "created_at": s.created_at.isoformat()}
            for s in SystemStatus.query.order_by(SystemStatus.id.asc()).all()
        ]
        role_counts = {
            r.name: User.query.filter_by(role_id=r.id).count() for r in Role.query.all()
        }
        return {
            "database_connected": db_connected,
            "checked_at": datetime.utcnow().isoformat(),
            "status_markers": status_markers,
            "role_counts": role_counts,
            "table_counts": {
                "users": User.query.count(),
                "classes": Class.query.count(),
                "subjects": Subject.query.count(),
                "topics": Topic.query.count(),
                "questions": Question.query.count(),
                "assessments": Assessment.query.count(),
                "attempts": Attempt.query.count(),
                "mastery_records": MasteryRecord.query.count(),
                "interventions": Intervention.query.count(),
                "reports": Report.query.count(),
                "study_sessions": StudySession.query.count(),
                "daily_activity_rows": StudentDailyActivity.query.count(),
                "audit_logs": AuditLog.query.count(),
            },
        }
