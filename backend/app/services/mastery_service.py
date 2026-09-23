import math
from datetime import datetime

from app.extensions import db
from app.models.academic import Topic
from app.models.assessment import Answer, Attempt
from app.models.content import Question
from app.models.mastery import MasteryRecord


class MasteryService:
    MODEL_VERSION = "heuristic-v1"
    RECENCY_LAMBDA = 0.05  # Decay parameter for exponential decay (half-life ~14 days)

    @staticmethod
    def get_mastery_band(score):
        """
        Determines the explainable mastery band based on score:
        0-39: Needs strong support
        40-59: Developing
        60-79: Proficient
        80-100: Secure
        """
        if score < 40.0:
            return "Needs strong support"
        elif score < 60.0:
            return "Developing"
        elif score < 80.0:
            return "Proficient"
        else:
            return "Secure"

    @staticmethod
    def calculate_topic_mastery(student_id, topic_id):
        """
        Calculates explainable topic mastery for a student across all completed attempts.
        Formula:
            mastery = 0.40 * accuracy + 0.20 * difficulty_comp + 0.20 * recency_comp + 0.20 * trend_comp
        All components are normalized between 0.0 and 100.0.
        """
        topic = db.session.get(Topic, topic_id)
        if not topic:
            raise LookupError(f"Topic with ID {topic_id} not found.")

        # Query all answers for this student for questions belonging to this topic in submitted/scored attempts
        answers = (
            db.session.query(Answer, Question, Attempt)
            .join(Question, Answer.question_id == Question.id)
            .join(Attempt, Answer.attempt_id == Attempt.id)
            .filter(
                Attempt.student_id == student_id,
                Attempt.status.in_(["submitted", "scored"]),
                Question.topic_id == topic_id,
            )
            .order_by(Attempt.submitted_at.asc(), Answer.id.asc())
            .all()
        )

        evidence_count = len(answers)
        if evidence_count == 0:
            # Baseline unassessed state
            return {
                "student_id": student_id,
                "topic_id": topic_id,
                "topic_title": topic.title,
                "mastery_score": 0.0,
                "accuracy_component": 0.0,
                "difficulty_component": 0.0,
                "recency_component": 0.0,
                "trend_component": 50.0,
                "evidence_count": 0,
                "band": "Needs strong support",
                "model_version": MasteryService.MODEL_VERSION,
                "calculated_at": datetime.utcnow().isoformat(),
            }

        now = datetime.utcnow()
        correct_count = 0
        total_difficulty_weight = 0.0
        earned_difficulty_weight = 0.0
        recency_weighted_sum = 0.0
        recency_weight_total = 0.0

        for ans, q, att in answers:
            is_correct = bool(ans.is_correct)
            if is_correct:
                correct_count += 1

            # 1. Difficulty component: difficulty 1=33.3, 2=66.7, 3=100.0
            diff = q.difficulty if q.difficulty in (1, 2, 3) else 1
            diff_weight = (diff / 3.0) * 100.0
            total_difficulty_weight += diff_weight
            if is_correct:
                earned_difficulty_weight += diff_weight

            # 2. Recency component: exponential decay R_i = e^(-lambda * delta_days)
            att_time = att.submitted_at or ans.created_at or now
            delta_days = max(0.0, (now - att_time).total_seconds() / 86400.0)
            r_weight = math.exp(-MasteryService.RECENCY_LAMBDA * delta_days)
            recency_weight_total += r_weight
            recency_weighted_sum += r_weight * (100.0 if is_correct else 0.0)

        # Accuracy (0-100)
        accuracy_comp = (correct_count / float(evidence_count)) * 100.0

        # Difficulty component (0-100)
        difficulty_comp = (
            (earned_difficulty_weight / total_difficulty_weight) * 100.0
            if total_difficulty_weight > 0
            else accuracy_comp
        )

        # Recency component (0-100)
        recency_comp = (
            (recency_weighted_sum / recency_weight_total)
            if recency_weight_total > 0
            else accuracy_comp
        )

        # 3. Trend component (0-100, 50 neutral): compare recent half vs earlier half
        if evidence_count >= 4:
            half = evidence_count // 2
            earlier_answers = answers[:half]
            recent_answers = answers[half:]

            earlier_acc = (
                sum(1 for a, _, _ in earlier_answers if a.is_correct)
                / float(len(earlier_answers))
            ) * 100.0
            recent_acc = (
                sum(1 for a, _, _ in recent_answers if a.is_correct)
                / float(len(recent_answers))
            ) * 100.0

            delta = recent_acc - earlier_acc  # ranges from -100 to +100
            trend_comp = min(100.0, max(0.0, 50.0 + (delta / 2.0)))
        else:
            trend_comp = 50.0  # neutral

        # Combine components
        mastery_score = (
            0.40 * accuracy_comp
            + 0.20 * difficulty_comp
            + 0.20 * recency_comp
            + 0.20 * trend_comp
        )
        mastery_score = round(min(100.0, max(0.0, mastery_score)), 1)
        accuracy_comp = round(accuracy_comp, 1)
        difficulty_comp = round(difficulty_comp, 1)
        recency_comp = round(recency_comp, 1)
        trend_comp = round(trend_comp, 1)

        source_start_id = answers[0][2].id if answers else None
        source_end_id = answers[-1][2].id if answers else None

        return {
            "student_id": student_id,
            "topic_id": topic_id,
            "topic_title": topic.title,
            "mastery_score": mastery_score,
            "accuracy_component": accuracy_comp,
            "difficulty_component": difficulty_comp,
            "recency_component": recency_comp,
            "trend_component": trend_comp,
            "evidence_count": evidence_count,
            "source_attempt_start_id": source_start_id,
            "source_attempt_end_id": source_end_id,
            "band": MasteryService.get_mastery_band(mastery_score),
            "model_version": MasteryService.MODEL_VERSION,
            "calculated_at": now.isoformat(),
        }

    @staticmethod
    def calculate_and_persist_mastery(student_id, topic_id):
        """
        Calculates mastery for a topic and persists a versioned MasteryRecord snapshot.
        """
        metrics = MasteryService.calculate_topic_mastery(student_id, topic_id)

        record = MasteryRecord(
            student_id=student_id,
            topic_id=topic_id,
            mastery_score=metrics["mastery_score"],
            accuracy_component=metrics["accuracy_component"],
            difficulty_component=metrics["difficulty_component"],
            recency_component=metrics["recency_component"],
            trend_component=metrics["trend_component"],
            evidence_count=metrics["evidence_count"],
            source_attempt_start_id=metrics.get("source_attempt_start_id"),
            source_attempt_end_id=metrics.get("source_attempt_end_id"),
            calculated_at=datetime.utcnow(),
            model_version=MasteryService.MODEL_VERSION,
        )
        db.session.add(record)
        db.session.commit()

        metrics["record_id"] = record.id
        return metrics

    @staticmethod
    def get_latest_mastery(student_id, topic_id):
        """Fetches the most recent mastery snapshot for a topic."""
        record = (
            MasteryRecord.query.filter_by(student_id=student_id, topic_id=topic_id)
            .order_by(MasteryRecord.calculated_at.desc(), MasteryRecord.id.desc())
            .first()
        )
        if record:
            return {
                "record_id": record.id,
                "student_id": record.student_id,
                "topic_id": record.topic_id,
                "topic_title": record.topic.title if record.topic else None,
                "mastery_score": record.mastery_score,
                "accuracy_component": record.accuracy_component,
                "difficulty_component": record.difficulty_component,
                "recency_component": record.recency_component,
                "trend_component": record.trend_component,
                "evidence_count": record.evidence_count,
                "band": MasteryService.get_mastery_band(record.mastery_score),
                "model_version": record.model_version,
                "calculated_at": record.calculated_at.isoformat(),
            }
        return MasteryService.calculate_topic_mastery(student_id, topic_id)
