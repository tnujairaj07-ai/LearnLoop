"""
Report Service

Generates, persists, and formats Traditional and Analytics Report Cards for
students and classes in accordance with explainable learning intelligence principles.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.extensions import db
from app.models.academic import Subject, Topic
from app.models.assessment import Assessment, Attempt
from app.models.governance import LearningGainRecord, Report
from app.models.intervention import Intervention, InterventionStudent
from app.models.mastery import ErrorPatternFlag, MasteryRecord, Recommendation
from app.models.user import Class, Enrollment, TeacherAssignment, User
from app.services.audit_service import AuditService
from app.utils.errors import ForbiddenError, NotFoundError, ValidationError


class ReportService:
    @staticmethod
    def _verify_student_access(actor_id: int, actor_role: str, student_id: int, subject_id: Optional[int] = None) -> None:
        """
        Verify that actor has authorization to access the student's report.
        - Admin: full access
        - Student: only their own report
        - Teacher: must be assigned to student's enrolled class for the subject
        """
        if actor_role == "admin":
            return

        if actor_role == "student":
            if actor_id != student_id:
                raise ForbiddenError("Students can only view their own reports.")
            return

        if actor_role == "teacher":
            enrollment = Enrollment.query.filter_by(student_id=student_id, status="active").first()
            if not enrollment:
                raise ForbiddenError("Student is not actively enrolled in any class.")

            query = TeacherAssignment.query.filter_by(
                teacher_id=actor_id,
                class_id=enrollment.class_id,
                is_active=True,
            )
            if subject_id:
                query = query.filter_by(subject_id=subject_id)

            assignment = query.first()
            if not assignment:
                raise ForbiddenError("You are not assigned to this student's class and subject.")
            return

        raise ForbiddenError("Unauthorized access to student report.")

    @staticmethod
    def _verify_class_access(actor_id: int, actor_role: str, class_id: int, subject_id: int) -> None:
        """
        Verify that actor has authorization to access the class report.
        - Admin: full access
        - Teacher: must be assigned to this class and subject
        - Student: 403 Forbidden
        """
        if actor_role == "admin":
            return

        if actor_role == "teacher":
            assignment = TeacherAssignment.query.filter_by(
                teacher_id=actor_id,
                class_id=class_id,
                subject_id=subject_id,
                is_active=True,
            ).first()
            if not assignment:
                raise ForbiddenError("You are not assigned to teach this class and subject.")
            return

        raise ForbiddenError("Only assigned teachers and administrators can view class reports.")

    @staticmethod
    def _get_band_label(score: float) -> str:
        """Convert a 0-100 score into constructive pedagogical band label."""
        if score >= 80.0:
            return "Secure"
        elif score >= 60.0:
            return "Proficient"
        elif score >= 40.0:
            return "Developing"
        return "Needs strong support"

    @classmethod
    def generate_student_report(
        cls,
        actor_id: int,
        actor_role: str,
        student_id: int,
        subject_id: int,
        term_label: str = "Term 1",
        report_type: str = "student",
    ) -> Dict[str, Any]:
        """
        Generate and persist a student report combining traditional and explainable analytics sections.
        """
        cls._verify_student_access(actor_id, actor_role, student_id, subject_id)

        student = User.query.get(student_id)
        if not student:
            raise NotFoundError("Student not found.")

        subject = Subject.query.get(subject_id)
        if not subject:
            raise NotFoundError("Subject not found.")

        enrollment = Enrollment.query.filter_by(student_id=student_id, status="active").first()
        classroom = Class.query.get(enrollment.class_id) if enrollment else None

        # 1. Gather all student attempts in this subject
        attempts = (
            Attempt.query.join(Assessment, Attempt.assessment_id == Assessment.id)
            .filter(
                Attempt.student_id == student_id,
                Assessment.subject_id == subject_id,
                Attempt.status.in_(["submitted", "scored"]),
            )
            .all()
        )

        total_attempts = len(attempts)
        avg_accuracy = (
            round(sum(a.percentage or 0.0 for a in attempts) / total_attempts, 1)
            if total_attempts > 0
            else 0.0
        )
        practice_count = sum(1 for a in attempts if a.assessment and a.assessment.assessment_type == "practice")
        diagnostic_count = sum(1 for a in attempts if a.assessment and a.assessment.assessment_type == "diagnostic")
        reassessment_count = sum(1 for a in attempts if a.assessment and a.assessment.assessment_type == "reassessment")

        # 2. Topic Masteries & Deconstruction
        topics = Topic.query.filter_by(subject_id=subject_id).order_by(Topic.order_index).all()
        topic_summaries = []
        mastery_scores = []

        for topic in topics:
            latest_mr = (
                MasteryRecord.query.filter_by(student_id=student_id, topic_id=topic.id)
                .order_by(MasteryRecord.calculated_at.desc())
                .first()
            )
            if latest_mr:
                m_score = round(latest_mr.mastery_score, 1)
                acc_comp = round(latest_mr.accuracy_component, 1)
                diff_comp = round(latest_mr.difficulty_component, 1)
                rec_comp = round(latest_mr.recency_component, 1)
                tr_comp = round(latest_mr.trend_component, 1)
                from app.services.mastery_service import MasteryService
                band = MasteryService.get_mastery_band(m_score)
                calc_time = latest_mr.calculated_at.isoformat() if latest_mr.calculated_at else None
                evidence_n = latest_mr.evidence_count
            else:
                m_score = 0.0
                acc_comp = diff_comp = rec_comp = tr_comp = 0.0
                band = "unassessed"
                calc_time = None
                evidence_n = 0

            mastery_scores.append(m_score)
            topic_summaries.append(
                {
                    "topic_id": topic.id,
                    "title": topic.title,
                    "order_index": topic.order_index,
                    "mastery_score": m_score,
                    "mastery_band": band,
                    "band_label": cls._get_band_label(m_score) if band != "unassessed" else "Unassessed",
                    "components": {
                        "accuracy": acc_comp,
                        "difficulty": diff_comp,
                        "recency": rec_comp,
                        "trend": tr_comp,
                    },
                    "evidence_count": evidence_n,
                    "last_calculated": calc_time,
                }
            )

        overall_mastery = (
            round(sum(mastery_scores) / len(mastery_scores), 1) if mastery_scores else 0.0
        )
        overall_band = cls._get_band_label(overall_mastery)

        # 3. Learning Gain Records (Pre/Post)
        gain_records = (
            LearningGainRecord.query.filter_by(student_id=student_id)
            .join(Topic, LearningGainRecord.topic_id == Topic.id)
            .filter(Topic.subject_id == subject_id)
            .order_by(LearningGainRecord.calculated_at.desc())
            .all()
        )
        gains_payload = [
            {
                "id": gr.id,
                "topic_id": gr.topic_id,
                "topic_title": gr.topic.title if hasattr(gr, "topic") and gr.topic else None,
                "pre_score": gr.pre_score,
                "post_score": gr.post_score,
                "score_gain": gr.score_gain,
                "before_mastery": gr.before_mastery,
                "after_mastery": gr.after_mastery,
                "mastery_gain": gr.mastery_gain,
                "calculation_version": gr.calculation_version,
                "calculated_at": gr.calculated_at.isoformat() if gr.calculated_at else None,
            }
            for gr in gain_records
        ]

        # 4. Misconception Flags & Review Status
        error_flags = (
            ErrorPatternFlag.query.filter_by(student_id=student_id)
            .join(Topic, ErrorPatternFlag.topic_id == Topic.id)
            .filter(Topic.subject_id == subject_id)
            .all()
        )
        misconceptions_payload = [
            {
                "flag_id": ef.id,
                "topic_id": ef.topic_id,
                "topic_title": ef.topic.title if ef.topic else None,
                "error_tag_name": ef.error_tag.name if ef.error_tag else None,
                "occurrence_count": ef.match_count,
                "status": ef.status,
                "reviews": [
                    {
                        "action": rev.decision,
                        "notes": rev.note,
                        "created_at": rev.created_at.isoformat() if rev.created_at else None,
                    }
                    for rev in ef.reviews
                ],
            }
            for ef in error_flags
        ]

        # 5. Targeted Recommendations & Next Steps
        active_recs = (
            Recommendation.query.filter_by(student_id=student_id)
            .filter(Recommendation.status.in_(["generated", "viewed", "in_progress"]))
            .join(Topic, Recommendation.topic_id == Topic.id)
            .filter(Topic.subject_id == subject_id)
            .all()
        )
        recs_payload = [
            {
                "recommendation_id": rec.id,
                "topic_title": rec.topic.title if rec.topic else None,
                "priority": rec.priority,
                "reason": rec.reason,
                "actions": [
                    {
                        "action_type": a.action_type,
                        "title": a.title,
                        "status": a.status,
                        "completed": a.status == "completed",
                    }
                    for a in rec.actions
                ],
            }
            for rec in active_recs
        ]

        # Assemble Structured Report Payload
        payload = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "report_type": report_type,
                "term_label": term_label,
            },
            "student_profile": {
                "student_id": student.id,
                "name": student.name,
                "email": student.email,
                "class_id": classroom.id if classroom else None,
                "class_name": classroom.name if classroom else "Unassigned",
                "grade": classroom.grade if classroom else None,
                "section": classroom.section if classroom else None,
                "academic_year": classroom.academic_year if classroom else None,
            },
            "subject": {
                "id": subject.id,
                "name": subject.name,
                "code": subject.code,
            },
            "traditional_report": {
                "term_label": term_label,
                "overall_accuracy_percentage": avg_accuracy,
                "overall_mastery_score": overall_mastery,
                "overall_mastery_band": overall_band,
                "total_assessments_completed": total_attempts,
                "practice_sessions_completed": practice_count,
                "topic_grades": [
                    {
                        "topic": ts["title"],
                        "mastery_score": ts["mastery_score"],
                        "band": ts["band_label"],
                        "status": "Needs Support" if ts["mastery_score"] < 60 else "On Track",
                    }
                    for ts in topic_summaries
                ],
                "teacher_remarks": (
                    f"Student has completed {total_attempts} assessment sessions with an overall accuracy of {avg_accuracy}%. "
                    f"Overall mastery is currently in the '{overall_band}' band."
                ),
            },
            "analytics_report": {
                "term_label": term_label,
                "explainable_mastery_formula": "0.40 * accuracy + 0.20 * difficulty + 0.20 * recency + 0.20 * trend",
                "topic_mastery_decomposition": topic_summaries,
                "learning_gains": gains_payload,
                "misconception_patterns": misconceptions_payload,
                "active_recommendations": recs_payload,
                "next_steps_guidance": (
                    "Review targeted practice sets for topics under 60% mastery."
                    if overall_mastery < 60
                    else "Proceed with standard curriculum practice and challenge problems."
                ),
            },
        }

        # Check for existing report for this student, class, subject, and term
        class_id = classroom.id if classroom else None
        report = Report.query.filter_by(
            student_id=student_id,
            subject_id=subject_id,
            term_label=term_label,
        ).first()

        if report:
            report.report_type = report_type
            report.status = "generated"
            report.payload_json = payload
            report.generated_by = actor_id
            report.generated_at = datetime.utcnow()
            if class_id:
                report.class_id = class_id
        else:
            report = Report(
                student_id=student_id,
                class_id=class_id,
                subject_id=subject_id,
                term_label=term_label,
                report_type=report_type,
                status="generated",
                payload_json=payload,
                generated_by=actor_id,
                generated_at=datetime.utcnow(),
            )
            db.session.add(report)

        db.session.commit()

        # Audit event
        AuditService.log_event(
            action="report.generate",
            entity_type="Report",
            entity_id=report.id,
            actor_id=actor_id,
            metadata_json={
                "type": "student",
                "student_id": student_id,
                "subject_id": subject_id,
                "term": term_label,
                "report_type": report_type,
            },
        )

        return {
            "report_id": report.id,
            "student_id": student_id,
            "subject_id": subject_id,
            "term_label": term_label,
            "report_type": report_type,
            "status": report.status,
            "generated_at": report.generated_at.isoformat(),
            "payload": payload,
        }

    @classmethod
    def get_student_report(
        cls,
        actor_id: int,
        actor_role: str,
        student_id: int,
        term_label: str,
        subject_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Retrieve a previously generated student report, or generate if none exists yet.
        """
        cls._verify_student_access(actor_id, actor_role, student_id, subject_id)

        query = Report.query.filter_by(student_id=student_id, term_label=term_label)
        if subject_id:
            query = query.filter_by(subject_id=subject_id)

        report = query.order_by(Report.generated_at.desc()).first()
        if not report:
            # Auto-resolve subject if not explicitly specified
            if not subject_id:
                enrollment = Enrollment.query.filter_by(student_id=student_id, status="active").first()
                if enrollment:
                    # Pick first assigned subject for this class
                    assignment = TeacherAssignment.query.filter_by(class_id=enrollment.class_id, is_active=True).first()
                    subject_id = assignment.subject_id if assignment else 1
                else:
                    subject_id = 1
            return cls.generate_student_report(
                actor_id=actor_id,
                actor_role=actor_role,
                student_id=student_id,
                subject_id=subject_id,
                term_label=term_label,
            )

        return {
            "report_id": report.id,
            "student_id": report.student_id,
            "class_id": report.class_id,
            "subject_id": report.subject_id,
            "term_label": report.term_label,
            "report_type": report.report_type,
            "status": report.status,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "payload": report.payload_json,
        }

    @classmethod
    def generate_class_report(
        cls,
        actor_id: int,
        actor_role: str,
        class_id: int,
        subject_id: int,
        term_label: str = "Term 1",
        report_type: str = "class",
    ) -> Dict[str, Any]:
        """
        Generate and persist an aggregate Class Report card.
        """
        cls._verify_class_access(actor_id, actor_role, class_id, subject_id)

        classroom = Class.query.get(class_id)
        if not classroom:
            raise NotFoundError("Class not found.")

        subject = Subject.query.get(subject_id)
        if not subject:
            raise NotFoundError("Subject not found.")

        # Enrolled students
        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        student_ids = [e.student_id for e in enrollments]
        total_students = len(student_ids)

        if total_students == 0:
            student_roster = []
            class_avg_accuracy = 0.0
            class_avg_mastery = 0.0
            band_distribution = {
                "Needs strong support": 0,
                "Developing": 0,
                "Proficient": 0,
                "Secure": 0,
            }
        else:
            # 1. Student roster performance
            student_roster = []
            all_student_masteries = []
            all_student_accuracies = []
            band_distribution = {
                "Needs strong support": 0,
                "Developing": 0,
                "Proficient": 0,
                "Secure": 0,
            }

            for s_id in student_ids:
                s_user = User.query.get(s_id)
                if not s_user:
                    continue

                # Student attempts in this subject
                s_attempts = (
                    Attempt.query.join(Assessment, Attempt.assessment_id == Assessment.id)
                    .filter(
                        Attempt.student_id == s_id,
                        Assessment.subject_id == subject_id,
                        Attempt.status.in_(["submitted", "scored"]),
                    )
                    .all()
                )
                s_acc = (
                    round(sum(a.percentage or 0.0 for a in s_attempts) / len(s_attempts), 1)
                    if s_attempts
                    else 0.0
                )
                all_student_accuracies.append(s_acc)

                # Student average mastery across topics
                topics = Topic.query.filter_by(subject_id=subject_id).all()
                t_scores = []
                for t in topics:
                    latest_mr = (
                        MasteryRecord.query.filter_by(student_id=s_id, topic_id=t.id)
                        .order_by(MasteryRecord.calculated_at.desc())
                        .first()
                    )
                    if latest_mr:
                        t_scores.append(latest_mr.mastery_score)

                s_mastery = round(sum(t_scores) / len(t_scores), 1) if t_scores else 0.0
                all_student_masteries.append(s_mastery)

                s_band = cls._get_band_label(s_mastery)
                band_distribution[s_band] += 1

                # Constructive support flag
                if s_mastery < 40:
                    support_cat = "Needs teacher support"
                elif s_mastery < 60:
                    support_cat = "Developing"
                elif s_mastery < 80:
                    support_cat = "Proficient"
                else:
                    support_cat = "Ready for next level"

                student_roster.append(
                    {
                        "student_id": s_id,
                        "name": s_user.name,
                        "average_accuracy": s_acc,
                        "overall_mastery": s_mastery,
                        "mastery_band": s_band,
                        "support_category": support_cat,
                    }
                )

            class_avg_accuracy = (
                round(sum(all_student_accuracies) / len(all_student_accuracies), 1)
                if all_student_accuracies
                else 0.0
            )
            class_avg_mastery = (
                round(sum(all_student_masteries) / len(all_student_masteries), 1)
                if all_student_masteries
                else 0.0
            )

        # 2. Topic Curriculum Heatmap & Class Averages
        topics = Topic.query.filter_by(subject_id=subject_id).order_by(Topic.order_index).all()
        topic_matrix = []
        for topic in topics:
            scores_for_topic = []
            for s_id in student_ids:
                latest_mr = (
                    MasteryRecord.query.filter_by(student_id=s_id, topic_id=topic.id)
                    .order_by(MasteryRecord.calculated_at.desc())
                    .first()
                )
                if latest_mr:
                    scores_for_topic.append(latest_mr.mastery_score)

            t_avg = (
                round(sum(scores_for_topic) / len(scores_for_topic), 1)
                if scores_for_topic
                else 0.0
            )
            topic_matrix.append(
                {
                    "topic_id": topic.id,
                    "title": topic.title,
                    "order_index": topic.order_index,
                    "class_average_mastery": t_avg,
                    "assessed_students_count": len(scores_for_topic),
                    "band": cls._get_band_label(t_avg),
                }
            )

        # 3. Class Misconception Frequency
        error_flags = (
            ErrorPatternFlag.query.filter(ErrorPatternFlag.student_id.in_(student_ids))
            .join(Topic, ErrorPatternFlag.topic_id == Topic.id)
            .filter(Topic.subject_id == subject_id)
            .all()
        )
        flag_counts: Dict[str, Dict[str, Any]] = {}
        for ef in error_flags:
            tag_name = ef.error_tag.name if ef.error_tag else "Unknown"
            if tag_name not in flag_counts:
                flag_counts[tag_name] = {
                    "tag_name": tag_name,
                    "description": ef.error_tag.description if ef.error_tag else None,
                    "affected_students": set(),
                    "total_occurrences": 0,
                    "statuses": {},
                }
            flag_counts[tag_name]["affected_students"].add(ef.student_id)
            flag_counts[tag_name]["total_occurrences"] += ef.match_count
            flag_counts[tag_name]["statuses"][ef.status] = (
                flag_counts[tag_name]["statuses"].get(ef.status, 0) + 1
            )

        misconceptions_summary = [
            {
                "tag_name": v["tag_name"],
                "description": v["description"],
                "affected_students_count": len(v["affected_students"]),
                "total_occurrences": v["total_occurrences"],
                "statuses": v["statuses"],
            }
            for v in flag_counts.values()
        ]

        # 4. Interventions & Average Learning Gain
        interventions = (
            Intervention.query.filter_by(class_id=class_id, subject_id=subject_id).all()
        )
        gain_records = (
            LearningGainRecord.query.filter(LearningGainRecord.student_id.in_(student_ids))
            .join(Topic, LearningGainRecord.topic_id == Topic.id)
            .filter(Topic.subject_id == subject_id)
            .all()
        )
        avg_score_gain = (
            round(sum(gr.score_gain for gr in gain_records) / len(gain_records), 1)
            if gain_records
            else 0.0
        )
        avg_mastery_gain = (
            round(sum(gr.mastery_gain or 0.0 for gr in gain_records) / len(gain_records), 1)
            if gain_records
            else 0.0
        )

        # Assemble Class Payload
        payload = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "report_type": report_type,
                "term_label": term_label,
            },
            "class_profile": {
                "class_id": classroom.id,
                "name": classroom.name,
                "grade": classroom.grade,
                "section": classroom.section,
                "academic_year": classroom.academic_year,
                "total_students": total_students,
            },
            "subject": {
                "id": subject.id,
                "name": subject.name,
                "code": subject.code,
            },
            "class_summary": {
                "average_accuracy_percentage": class_avg_accuracy,
                "average_topic_mastery": class_avg_mastery,
                "mastery_band": cls._get_band_label(class_avg_mastery),
                "band_distribution": band_distribution,
            },
            "curriculum_heatmap": topic_matrix,
            "misconception_frequencies": misconceptions_summary,
            "interventions_impact": {
                "total_interventions": len(interventions),
                "completed_interventions": sum(1 for inv in interventions if inv.status == "completed"),
                "learning_gains_evaluated": len(gain_records),
                "average_score_gain": avg_score_gain,
                "average_mastery_gain": avg_mastery_gain,
            },
            "student_roster_diagnostic": student_roster,
        }

        # Check existing class report
        report = Report.query.filter_by(
            class_id=class_id,
            subject_id=subject_id,
            term_label=term_label,
            report_type=report_type,
        ).first()

        if report:
            report.status = "generated"
            report.payload_json = payload
            report.generated_by = actor_id
            report.generated_at = datetime.utcnow()
        else:
            report = Report(
                class_id=class_id,
                subject_id=subject_id,
                term_label=term_label,
                report_type=report_type,
                status="generated",
                payload_json=payload,
                generated_by=actor_id,
                generated_at=datetime.utcnow(),
            )
            db.session.add(report)

        db.session.commit()

        # Audit event
        AuditService.log_event(
            action="report.generate",
            entity_type="Report",
            entity_id=report.id,
            actor_id=actor_id,
            metadata_json={
                "type": "class",
                "class_id": class_id,
                "subject_id": subject_id,
                "term": term_label,
                "report_type": report_type,
            },
        )

        return {
            "report_id": report.id,
            "class_id": class_id,
            "subject_id": subject_id,
            "term_label": term_label,
            "report_type": report_type,
            "status": report.status,
            "generated_at": report.generated_at.isoformat(),
            "payload": payload,
        }

    @classmethod
    def get_class_report(
        cls,
        actor_id: int,
        actor_role: str,
        class_id: int,
        subject_id: int,
        term_label: str,
    ) -> Dict[str, Any]:
        """
        Retrieve class report, or auto-generate if not yet generated.
        """
        cls._verify_class_access(actor_id, actor_role, class_id, subject_id)

        report = Report.query.filter_by(
            class_id=class_id,
            subject_id=subject_id,
            term_label=term_label,
        ).order_by(Report.generated_at.desc()).first()

        if not report:
            return cls.generate_class_report(
                actor_id=actor_id,
                actor_role=actor_role,
                class_id=class_id,
                subject_id=subject_id,
                term_label=term_label,
            )

        return {
            "report_id": report.id,
            "class_id": report.class_id,
            "subject_id": report.subject_id,
            "term_label": report.term_label,
            "report_type": report.report_type,
            "status": report.status,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "payload": report.payload_json,
        }

    @classmethod
    def get_report_by_id(cls, actor_id: int, actor_role: str, report_id: int) -> Dict[str, Any]:
        """
        Retrieve any report by its primary key with strict RBAC & scoping.
        """
        report = Report.query.get(report_id)
        if not report:
            raise NotFoundError("Report not found.")

        if report.student_id:
            cls._verify_student_access(actor_id, actor_role, report.student_id, report.subject_id)
        elif report.class_id:
            cls._verify_class_access(actor_id, actor_role, report.class_id, report.subject_id)

        return {
            "report_id": report.id,
            "student_id": report.student_id,
            "class_id": report.class_id,
            "subject_id": report.subject_id,
            "term_label": report.term_label,
            "report_type": report.report_type,
            "status": report.status,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "payload": report.payload_json,
        }
