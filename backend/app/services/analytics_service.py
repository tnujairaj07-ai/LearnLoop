from datetime import datetime

from app.extensions import db
from app.models.academic import Subject, Topic
from app.models.assessment import Answer, Assessment, AssessmentQuestion, Attempt
from app.models.intervention import Intervention
from app.models.mastery import ErrorPatternFlag, MasteryRecord
from app.models.user import Class, Enrollment, TeacherAssignment, User
from app.services.error_pattern_service import ErrorPatternService
from app.services.mastery_service import MasteryService
from app.services.recommendation_service import RecommendationService


class AnalyticsService:
    @staticmethod
    def get_student_dashboard(student_id):
        """
        Gathers high-level student dashboard data:
        - Active subject & enrolled class
        - Overall subject mastery
        - Topic breakdown cards with explainable mastery bands
        - Active recommendations & concrete next steps
        - Recent attempt activity
        """
        # Active enrollments
        enrollments = Enrollment.query.filter_by(student_id=student_id, status="active").all()
        classes_data = [
            {
                "class_id": e.classroom.id,
                "class_name": e.classroom.name,
                "grade": e.classroom.grade,
                "section": e.classroom.section,
            }
            for e in enrollments
            if e.classroom is not None
        ]

        # Topics for mathematics
        topics = Topic.query.order_by(Topic.order_index.asc()).all()
        topic_summaries = []
        mastery_scores = []

        for t in topics:
            m = MasteryService.get_latest_mastery(student_id, t.id)
            topic_summaries.append({
                "topic_id": t.id,
                "title": t.title,
                "description": t.description,
                "order_index": t.order_index,
                "mastery_score": m["mastery_score"],
                "band": m["band"],
                "accuracy": m["accuracy_component"],
                "evidence_count": m["evidence_count"],
                "calculated_at": m.get("calculated_at"),
            })
            if m["evidence_count"] > 0:
                mastery_scores.append(m["mastery_score"])

        overall_mastery = (
            round(sum(mastery_scores) / float(len(mastery_scores)), 1)
            if mastery_scores
            else 0.0
        )
        overall_band = MasteryService.get_mastery_band(overall_mastery)

        # Active recommendations
        recommendations = RecommendationService.get_student_recommendations(student_id)

        # Recent attempts
        attempts = (
            Attempt.query.filter_by(student_id=student_id)
            .order_by(Attempt.created_at.desc())
            .limit(5)
            .all()
        )
        recent_attempts = [
            {
                "attempt_id": att.id,
                "assessment_id": att.assessment_id,
                "assessment_title": att.assessment.title if att.assessment else None,
                "attempt_type": att.attempt_type,
                "status": att.status,
                "score": att.score,
                "percentage": att.percentage,
                "submitted_at": att.submitted_at.isoformat() if att.submitted_at else None,
            }
            for att in attempts
        ]

        # Active error pattern flags
        active_flags = ErrorPatternService.get_active_flags(student_id)

        return {
            "student_id": student_id,
            "classes": classes_data,
            "overall_mastery": overall_mastery,
            "overall_band": overall_band,
            "topic_summaries": topic_summaries,
            "recommendations": recommendations,
            "active_flags_count": len(active_flags),
            "recent_attempts": recent_attempts,
        }

    @staticmethod
    def get_student_mastery(student_id):
        """Returns topic-by-topic mastery breakdowns with all 4 explainable components."""
        topics = Topic.query.order_by(Topic.order_index.asc()).all()
        records = []
        for t in topics:
            m = MasteryService.get_latest_mastery(student_id, t.id)
            records.append({
                "topic_id": t.id,
                "topic_title": t.title,
                "order_index": t.order_index,
                "mastery_score": m["mastery_score"],
                "band": m["band"],
                "components": {
                    "accuracy": m["accuracy_component"],
                    "difficulty": m["difficulty_component"],
                    "recency": m["recency_component"],
                    "trend": m["trend_component"],
                },
                "evidence_count": m["evidence_count"],
                "model_version": m.get("model_version", "heuristic-v1"),
                "calculated_at": m.get("calculated_at"),
            })
        return {"student_id": student_id, "topics": records}

    @staticmethod
    def get_student_growth(student_id):
        """Returns chronological time-series of assessment attempts and scores."""
        attempts = (
            Attempt.query.filter_by(student_id=student_id)
            .filter(Attempt.status.in_(["submitted", "scored"]))
            .order_by(Attempt.submitted_at.asc())
            .all()
        )

        growth_points = [
            {
                "attempt_id": att.id,
                "assessment_id": att.assessment_id,
                "assessment_title": att.assessment.title if att.assessment else None,
                "attempt_type": att.attempt_type,
                "status": att.status,
                "score": att.score,
                "percentage": att.percentage,
                "submitted_at": att.submitted_at.isoformat() if att.submitted_at else None,
            }
            for att in attempts
        ]

        return {"student_id": student_id, "growth_timeline": growth_points}

    @staticmethod
    def get_teacher_classes(teacher_id):
        """Returns all classes and subjects assigned to the authenticated teacher."""
        assignments = TeacherAssignment.query.filter_by(teacher_id=teacher_id).all()
        classes_data = []
        for ta in assignments:
            c = ta.classroom
            if not c:
                continue
            enrolled_count = Enrollment.query.filter_by(class_id=c.id, status="active").count()
            classes_data.append({
                "class_id": c.id,
                "class_name": c.name,
                "grade": c.grade,
                "section": c.section,
                "academic_year": c.academic_year,
                "subject_id": ta.subject_id,
                "subject_name": ta.subject.name if ta.subject else None,
                "enrolled_students_count": enrolled_count,
            })
        return classes_data

    @staticmethod
    def verify_teacher_class_access(teacher_id, class_id):
        """Verifies if the teacher is assigned to the specified class."""
        assignment = TeacherAssignment.query.filter_by(
            teacher_id=teacher_id, class_id=class_id
        ).first()
        if not assignment:
            raise PermissionError("Access denied: You are not assigned to teach this class.")
        return assignment

    @staticmethod
    def get_class_dashboard(teacher_id, class_id):
        """
        Gathers high-level class overview diagnostics:
        - Total enrolled students
        - Overall class mastery average
        - Mastery band distribution across students
        - Assessment participation & completion rates
        - Active interventions count
        """
        AnalyticsService.verify_teacher_class_access(teacher_id, class_id)
        classroom = Class.query.get(class_id)
        if not classroom:
            raise ValueError(f"Class with ID {class_id} not found.")

        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        student_ids = [e.student_id for e in enrollments]
        total_enrolled = len(student_ids)

        topics = Topic.query.order_by(Topic.order_index.asc()).all()

        band_counts = {
            "Needs strong support": 0,
            "Developing": 0,
            "Proficient": 0,
            "Secure": 0,
        }
        student_avg_masteries = []

        for sid in student_ids:
            scores = []
            for t in topics:
                m = MasteryService.get_latest_mastery(sid, t.id)
                if m["evidence_count"] > 0:
                    scores.append(m["mastery_score"])
            if scores:
                avg_m = round(sum(scores) / float(len(scores)), 1)
                student_avg_masteries.append(avg_m)
                if avg_m < 40:
                    band_counts["Needs strong support"] += 1
                elif avg_m < 60:
                    band_counts["Developing"] += 1
                elif avg_m < 80:
                    band_counts["Proficient"] += 1
                else:
                    band_counts["Secure"] += 1

        overall_class_mastery = (
            round(sum(student_avg_masteries) / float(len(student_avg_masteries)), 1)
            if student_avg_masteries
            else 0.0
        )

        assessments = Assessment.query.filter_by(class_id=class_id).all()
        total_assessments = len(assessments)
        completed_attempts_count = 0
        if student_ids:
            completed_attempts_count = Attempt.query.filter(
                Attempt.student_id.in_(student_ids),
                Attempt.status.in_(["submitted", "scored"])
            ).count()

        active_interventions_count = Intervention.query.filter_by(class_id=class_id).filter(
            Intervention.status.in_(["suggested", "reviewed", "assigned", "in_progress", "reassessment_pending"])
        ).count()

        active_error_flags_count = 0
        if student_ids:
            active_error_flags_count = ErrorPatternFlag.query.filter(
                ErrorPatternFlag.student_id.in_(student_ids),
                ErrorPatternFlag.status.in_(["suspected", "reviewed"])
            ).count()

        return {
            "class_id": class_id,
            "class_name": classroom.name,
            "grade": classroom.grade,
            "section": classroom.section,
            "total_enrolled": total_enrolled,
            "overall_class_mastery": overall_class_mastery,
            "mastery_band_distribution": band_counts,
            "total_assessments": total_assessments,
            "total_attempts_completed": completed_attempts_count,
            "active_interventions_count": active_interventions_count,
            "active_error_flags_count": active_error_flags_count,
        }

    @staticmethod
    def get_class_mastery_matrix(teacher_id, class_id):
        """Returns topic-by-topic heatmap and band distribution across all enrolled students."""
        AnalyticsService.verify_teacher_class_access(teacher_id, class_id)
        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        student_ids = [e.student_id for e in enrollments]
        student_names = {e.student_id: (e.student.name if e.student else f"Student {e.student_id}") for e in enrollments}

        topics = Topic.query.order_by(Topic.order_index.asc()).all()
        matrix = []

        for t in topics:
            scores = []
            topic_bands = {
                "Needs strong support": 0,
                "Developing": 0,
                "Proficient": 0,
                "Secure": 0,
            }
            students_summary = []

            for sid in student_ids:
                m = MasteryService.get_latest_mastery(sid, t.id)
                scores.append(m["mastery_score"])
                band = m["band"]
                topic_bands[band] = topic_bands.get(band, 0) + 1
                students_summary.append({
                    "student_id": sid,
                    "student_name": student_names.get(sid, f"Student {sid}"),
                    "mastery_score": m["mastery_score"],
                    "band": band,
                    "evidence_count": m["evidence_count"],
                })

            avg_score = round(sum(scores) / float(len(scores)), 1) if scores else 0.0

            matrix.append({
                "topic_id": t.id,
                "topic_title": t.title,
                "order_index": t.order_index,
                "average_mastery": avg_score,
                "band_distribution": topic_bands,
                "students": students_summary,
            })

        return {"class_id": class_id, "topics": matrix}

    @staticmethod
    def get_class_students_diagnostic(teacher_id, class_id):
        """
        Returns student roster diagnostic cards:
        - Per-topic mastery
        - Performance trend
        - Non-stigmatizing support category (Needs teacher support, Developing, Ready for next level)
        - Active error flags count
        - Latest assessment attempt
        """
        AnalyticsService.verify_teacher_class_access(teacher_id, class_id)
        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        topics = Topic.query.order_by(Topic.order_index.asc()).all()

        roster = []
        for e in enrollments:
            s = e.student
            if not s:
                continue

            topic_masteries = []
            scores = []
            needs_support_topics = 0

            for t in topics:
                m = MasteryService.get_latest_mastery(s.id, t.id)
                topic_masteries.append({
                    "topic_id": t.id,
                    "topic_title": t.title,
                    "mastery_score": m["mastery_score"],
                    "band": m["band"],
                })
                if m["evidence_count"] > 0:
                    scores.append(m["mastery_score"])
                if m["band"] == "Needs strong support":
                    needs_support_topics += 1

            avg_mastery = round(sum(scores) / float(len(scores)), 1) if scores else 0.0

            # Constructive, non-stigmatizing classification
            if needs_support_topics > 0 or (scores and avg_mastery < 40):
                support_category = "Needs teacher support"
            elif avg_mastery < 60:
                support_category = "Developing"
            elif avg_mastery < 80:
                support_category = "Proficient"
            else:
                support_category = "Ready for next level"

            active_flags = ErrorPatternFlag.query.filter_by(
                student_id=s.id
            ).filter(ErrorPatternFlag.status.in_(["suspected", "reviewed"])).count()

            latest_attempt = (
                Attempt.query.filter_by(student_id=s.id)
                .filter(Attempt.status.in_(["submitted", "scored"]))
                .order_by(Attempt.submitted_at.desc())
                .first()
            )

            latest_activity = None
            if latest_attempt:
                latest_activity = {
                    "attempt_id": latest_attempt.id,
                    "assessment_title": latest_attempt.assessment.title if latest_attempt.assessment else None,
                    "percentage": latest_attempt.percentage,
                    "submitted_at": latest_attempt.submitted_at.isoformat() if latest_attempt.submitted_at else None,
                }

            roster.append({
                "student_id": s.id,
                "student_name": s.name,
                "student_email": s.email,
                "average_mastery": avg_mastery,
                "support_category": support_category,
                "active_flags_count": active_flags,
                "topic_masteries": topic_masteries,
                "latest_activity": latest_activity,
            })

        return {"class_id": class_id, "students": roster}

    @staticmethod
    def get_assessment_item_analysis(teacher_id, class_id, assessment_id):
        """
        Evaluates question-by-question performance on an assessment:
        - Class accuracy per question
        - Distractor choice frequency distribution (options 'a', 'b', 'c', 'd')
        - Tagged misconception detections
        """
        AnalyticsService.verify_teacher_class_access(teacher_id, class_id)
        assessment = Assessment.query.get(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment with ID {assessment_id} not found.")

        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        student_ids = [e.student_id for e in enrollments]

        attempts = (
            Attempt.query.filter_by(assessment_id=assessment_id)
            .filter(Attempt.student_id.in_(student_ids), Attempt.status.in_(["submitted", "scored"]))
            .all()
        )
        attempt_ids = [att.id for att in attempts]
        total_attempts = len(attempt_ids)

        items_breakdown = []
        ordered_questions = (
            AssessmentQuestion.query.filter_by(assessment_id=assessment_id)
            .order_by(AssessmentQuestion.order_index.asc())
            .all()
        )

        for aq in ordered_questions:
            q = aq.question
            if not q:
                continue

            answers = (
                Answer.query.filter(Answer.attempt_id.in_(attempt_ids), Answer.question_id == q.id).all()
                if attempt_ids
                else []
            )

            total_answers = len(answers)
            correct_answers = sum(1 for a in answers if a.is_correct)
            accuracy = round((correct_answers / float(total_answers)) * 100, 1) if total_answers > 0 else 0.0

            option_counts = {}
            error_tags_detected = {}
            for a in answers:
                opt = a.answer_text or "unanswered"
                option_counts[opt] = option_counts.get(opt, 0) + 1
                if a.detected_error_tag:
                    tag_name = a.detected_error_tag.name
                    error_tags_detected[tag_name] = error_tags_detected.get(tag_name, 0) + 1

            items_breakdown.append({
                "question_id": q.id,
                "order_index": aq.order_index,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "difficulty": q.difficulty,
                "points": aq.points,
                "correct_answer": q.correct_answer,
                "total_responses": total_answers,
                "correct_responses": correct_answers,
                "accuracy_percentage": accuracy,
                "option_distribution": option_counts,
                "detected_error_tags": error_tags_detected,
            })

        avg_score = (
            round(sum(att.score for att in attempts) / float(len(attempts)), 2)
            if attempts
            else 0.0
        )
        avg_percentage = (
            round(sum(att.percentage for att in attempts) / float(len(attempts)), 1)
            if attempts
            else 0.0
        )

        return {
            "class_id": class_id,
            "assessment_id": assessment_id,
            "assessment_title": assessment.title,
            "total_participants": total_attempts,
            "average_score": avg_score,
            "average_percentage": avg_percentage,
            "questions": items_breakdown,
        }

    @staticmethod
    def get_class_error_patterns(teacher_id, class_id):
        """Aggregates all recurrent error pattern flags across students in the class."""
        AnalyticsService.verify_teacher_class_access(teacher_id, class_id)
        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        student_ids = [e.student_id for e in enrollments]

        if not student_ids:
            return {"class_id": class_id, "error_patterns": []}

        flags = (
            ErrorPatternFlag.query.filter(ErrorPatternFlag.student_id.in_(student_ids))
            .filter(ErrorPatternFlag.status.in_(["suspected", "reviewed"]))
            .all()
        )

        # Group by error_tag_id
        grouped = {}
        for f in flags:
            tag_id = f.error_tag_id
            if tag_id not in grouped:
                grouped[tag_id] = {
                    "tag_id": tag_id,
                    "tag_name": f.error_tag.name if f.error_tag else None,
                    "description": f.error_tag.description if f.error_tag else None,
                    "topic_id": f.topic_id,
                    "topic_title": f.topic.title if f.topic else None,
                    "affected_students": [],
                }
            grouped[tag_id]["affected_students"].append({
                "flag_id": f.id,
                "student_id": f.student_id,
                "student_name": f.student.name if f.student else None,
                "evidence_count": f.evidence_count,
                "incorrect_count": f.incorrect_count,
                "match_count": f.match_count,
                "status": f.status,
                "evidence_details": f.evidence_json,
                "calculated_at": f.calculated_at.isoformat() if f.calculated_at else None,
            })

        result = list(grouped.values())
        for r in result:
            r["affected_students_count"] = len(r["affected_students"])

        result.sort(key=lambda x: x["affected_students_count"], reverse=True)
        return {"class_id": class_id, "error_patterns": result}

