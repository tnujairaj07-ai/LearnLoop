from datetime import datetime

from app.extensions import db
from app.models.academic import Subject, Topic
from app.models.assessment import Attempt
from app.models.user import Enrollment
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
