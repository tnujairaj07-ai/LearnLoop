from datetime import datetime

from app.extensions import db
from app.models.academic import Resource, Topic
from app.models.assessment import Assessment
from app.models.mastery import ErrorPatternFlag, Recommendation, RecommendationAction
from app.services.error_pattern_service import ErrorPatternService
from app.services.mastery_service import MasteryService


class RecommendationService:
    MODEL_VERSION = "heuristic-v1"

    @staticmethod
    def generate_recommendations(student_id, topic_id):
        """
        Translates evidence (topic mastery, trend, and active error-pattern flags)
        into structured next actions according to LearnLoop decision rules.
        """
        topic = db.session.get(Topic, topic_id)
        if not topic:
            raise LookupError(f"Topic with ID {topic_id} not found.")

        # 1. Fetch current mastery snapshot
        mastery = MasteryService.get_latest_mastery(student_id, topic_id)
        score = mastery.get("mastery_score", 0.0)
        band = mastery.get("band", "Needs strong support")
        trend = mastery.get("trend_component", 50.0)

        # 2. Fetch active error-pattern flags
        flags = ErrorPatternService.get_active_flags(student_id, topic_id)

        # Check existing active recommendations to avoid duplicate spamming
        existing_rec = Recommendation.query.filter_by(
            student_id=student_id, topic_id=topic_id
        ).filter(Recommendation.status.in_(["generated", "viewed", "in_progress"])).first()

        now = datetime.utcnow()
        recommendation_type = "targeted_practice"
        priority = "medium"
        reason = ""
        actions_spec = []

        # Find helpful educational assets for this topic
        remedial_resource = (
            Resource.query.filter_by(topic_id=topic_id, approved=True)
            .order_by(Resource.difficulty.asc())
            .first()
        )
        practice_assessment = (
            Assessment.query.filter_by(topic_id=topic_id, assessment_type="practice", status="published")
            .first()
        )
        reassessment_assessment = (
            Assessment.query.filter_by(topic_id=topic_id, assessment_type="reassessment", status="published")
            .first()
        )

        # -------------------------------------------------------------
        # Decision Rules
        # -------------------------------------------------------------
        if flags:
            # Rule 1: Recurrent tagged misconception detected
            primary_flag = flags[0]
            recommendation_type = "remedial_error_pattern"
            priority = "high"
            tag_name = primary_flag["error_tag_name"] or "misconception pattern"
            reason = (
                f"Recurrent error pattern detected ({tag_name}). "
                f"Reviewing worked examples and targeted concept revision is recommended."
            )
            if remedial_resource:
                actions_spec.append({
                    "action_type": "resource",
                    "resource_id": remedial_resource.id,
                    "title": f"Review {remedial_resource.title}",
                })
            if practice_assessment:
                actions_spec.append({
                    "action_type": "practice",
                    "assessment_id": practice_assessment.id,
                    "title": f"Practice: {practice_assessment.title}",
                })

        elif score < 40.0:
            # Rule 2: Mastery below 40% (Needs strong support)
            recommendation_type = "foundational_support"
            priority = "high"
            reason = (
                f"Topic mastery is {score}% ({band}). "
                f"Foundational review and guided Level 1 practice recommended."
            )
            if remedial_resource:
                actions_spec.append({
                    "action_type": "resource",
                    "resource_id": remedial_resource.id,
                    "title": f"Study {remedial_resource.title}",
                })
            if practice_assessment:
                actions_spec.append({
                    "action_type": "practice",
                    "assessment_id": practice_assessment.id,
                    "title": f"Attempt {practice_assessment.title}",
                })

        elif score < 60.0:
            # Rule 3: Mastery 40-59% (Developing)
            recommendation_type = "skill_reinforcement"
            priority = "medium"
            reason = (
                f"Topic mastery is {score}% ({band}). "
                f"Targeted skill practice recommended to build fluency."
            )
            if practice_assessment:
                actions_spec.append({
                    "action_type": "practice",
                    "assessment_id": practice_assessment.id,
                    "title": f"Complete {practice_assessment.title}",
                })

        elif score < 80.0:
            # Rule 4: Mastery 60-79% (Proficient)
            recommendation_type = "reassessment_readiness"
            priority = "medium"
            reason = (
                f"Topic mastery is {score}% ({band}). "
                f"Reassessment recommended to confirm secure understanding."
            )
            if reassessment_assessment:
                actions_spec.append({
                    "action_type": "reassessment",
                    "assessment_id": reassessment_assessment.id,
                    "title": f"Take {reassessment_assessment.title}",
                })
            elif practice_assessment:
                actions_spec.append({
                    "action_type": "practice",
                    "assessment_id": practice_assessment.id,
                    "title": f"Medium practice: {practice_assessment.title}",
                })

        else:
            # Rule 5: Mastery >= 80% (Secure)
            recommendation_type = "topic_advancement"
            priority = "low"
            reason = (
                f"Topic mastery is {score}% ({band}). "
                f"Secure understanding demonstrated; ready for progression."
            )
            next_topic = (
                Topic.query.filter(
                    Topic.subject_id == topic.subject_id,
                    Topic.order_index > topic.order_index,
                )
                .order_by(Topic.order_index.asc())
                .first()
            )
            if next_topic:
                actions_spec.append({
                    "action_type": "next_topic",
                    "target_topic_id": next_topic.id,
                    "title": f"Advance to next topic: {next_topic.title}",
                })

        evidence = {
            "mastery_score": score,
            "mastery_band": band,
            "trend": trend,
            "evidence_count": mastery.get("evidence_count", 0),
            "flag_count": len(flags),
        }

        # If existing active recommendation exists, update it rather than creating duplicates
        if existing_rec:
            existing_rec.recommendation_type = recommendation_type
            existing_rec.priority = priority
            existing_rec.reason = reason
            existing_rec.evidence_json = evidence
            existing_rec.model_version = RecommendationService.MODEL_VERSION
            rec = existing_rec
        else:
            rec = Recommendation(
                student_id=student_id,
                topic_id=topic_id,
                recommendation_type=recommendation_type,
                priority=priority,
                reason=reason,
                evidence_json=evidence,
                status="generated",
                model_version=RecommendationService.MODEL_VERSION,
                created_at=now,
            )
            db.session.add(rec)
            db.session.flush()

        # Update action items
        if not existing_rec:
            for idx, act in enumerate(actions_spec, start=1):
                action_item = RecommendationAction(
                    recommendation_id=rec.id,
                    action_type=act["action_type"],
                    resource_id=act.get("resource_id"),
                    assessment_id=act.get("assessment_id"),
                    target_topic_id=act.get("target_topic_id"),
                    title=act["title"],
                    order_index=idx,
                    status="pending",
                )
                db.session.add(action_item)

        db.session.commit()
        return RecommendationService.serialize_recommendation(rec)

    @staticmethod
    def serialize_recommendation(rec):
        if not rec:
            return None

        actions = sorted(rec.actions, key=lambda a: a.order_index)
        return {
            "id": rec.id,
            "student_id": rec.student_id,
            "topic_id": rec.topic_id,
            "topic_title": rec.topic.title if rec.topic else None,
            "recommendation_type": rec.recommendation_type,
            "priority": rec.priority,
            "reason": rec.reason,
            "evidence": rec.evidence_json,
            "status": rec.status,
            "created_at": rec.created_at.isoformat() if rec.created_at else None,
            "completed_at": rec.completed_at.isoformat() if rec.completed_at else None,
            "actions": [
                {
                    "id": a.id,
                    "action_type": a.action_type,
                    "title": a.title,
                    "resource_id": a.resource_id,
                    "assessment_id": a.assessment_id,
                    "target_topic_id": a.target_topic_id,
                    "order_index": a.order_index,
                    "status": a.status,
                    "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                }
                for a in actions
            ],
        }

    @staticmethod
    def get_student_recommendations(student_id, topic_id=None, status=None):
        query = Recommendation.query.filter_by(student_id=student_id)
        if topic_id:
            query = query.filter_by(topic_id=topic_id)
        if status:
            query = query.filter_by(status=status)
        else:
            query = query.filter(Recommendation.status.in_(["generated", "viewed", "in_progress"]))

        recs = query.order_by(Recommendation.created_at.desc()).all()
        return [RecommendationService.serialize_recommendation(r) for r in recs]

    @staticmethod
    def update_recommendation_status(rec_id, status, student_id):
        rec = db.session.get(Recommendation, rec_id)
        if not rec:
            raise LookupError(f"Recommendation with ID {rec_id} not found.")
        if rec.student_id != student_id:
            raise PermissionError("Unauthorized access to recommendation.")

        if status not in ("viewed", "in_progress", "completed", "dismissed"):
            raise ValueError("Invalid status transition.")

        rec.status = status
        if status == "completed":
            rec.completed_at = datetime.utcnow()
        db.session.commit()
        return RecommendationService.serialize_recommendation(rec)

    @staticmethod
    def complete_action(action_id, student_id):
        action = db.session.get(RecommendationAction, action_id)
        if not action:
            raise LookupError(f"Recommendation action with ID {action_id} not found.")
        if action.recommendation.student_id != student_id:
            raise PermissionError("Unauthorized access to recommendation action.")

        action.status = "completed"
        action.completed_at = datetime.utcnow()

        # If all actions completed, mark recommendation completed
        all_actions = action.recommendation.actions
        if all(a.status == "completed" for a in all_actions):
            action.recommendation.status = "completed"
            action.recommendation.completed_at = datetime.utcnow()

        db.session.commit()
        return {
            "id": action.id,
            "recommendation_id": action.recommendation_id,
            "status": action.status,
            "completed_at": action.completed_at.isoformat(),
        }
