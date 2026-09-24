from datetime import datetime

from app.extensions import db
from app.models.academic import Subject
from app.models.user import Class, Enrollment, TeacherAssignment, User


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
            "students": students,
            "teachers": teachers,
        }

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
