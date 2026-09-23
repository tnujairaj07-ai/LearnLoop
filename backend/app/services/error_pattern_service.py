from datetime import datetime

from app.extensions import db
from app.models.academic import Topic
from app.models.assessment import Answer, Attempt
from app.models.content import ErrorTag, Question
from app.models.mastery import ErrorPatternFlag


class ErrorPatternService:
    MODEL_VERSION = "heuristic-v1"
    PATTERN_THRESHOLD = 2  # Minimum pattern matches required to flag a suspected misconception

    @staticmethod
    def detect_and_persist_flags(student_id, topic_id):
        """
        Scans all student responses for a topic. If a tagged error pattern matches >= 2 times,
        creates or updates a suspected ErrorPatternFlag record with transparent evidence.
        """
        topic = db.session.get(Topic, topic_id)
        if not topic:
            raise LookupError(f"Topic with ID {topic_id} not found.")

        # Fetch all answers for this student under this topic in completed attempts
        answers = (
            db.session.query(Answer, Question, Attempt)
            .join(Question, Answer.question_id == Question.id)
            .join(Attempt, Answer.attempt_id == Attempt.id)
            .filter(
                Attempt.student_id == student_id,
                Attempt.status.in_(["submitted", "scored"]),
                Question.topic_id == topic_id,
            )
            .all()
        )

        total_answers = len(answers)
        if total_answers == 0:
            return []

        incorrect_answers = [a for a in answers if not a[0].is_correct]
        total_incorrect = len(incorrect_answers)

        # Group matched error tags
        tag_matches = {}  # error_tag_id -> list of (ans, q, att)
        for ans, q, att in incorrect_answers:
            if ans.detected_error_tag_id:
                tag_matches.setdefault(ans.detected_error_tag_id, []).append((ans, q, att))

        flagged_records = []
        now = datetime.utcnow()

        for tag_id, matched_items in tag_matches.items():
            match_count = len(matched_items)
            if match_count >= ErrorPatternService.PATTERN_THRESHOLD:
                tag = db.session.get(ErrorTag, tag_id)
                if not tag:
                    continue

                evidence = {
                    "error_tag_id": tag.id,
                    "error_tag_name": tag.name,
                    "description": tag.description,
                    "match_count": match_count,
                    "total_incorrect": total_incorrect,
                    "total_answers_in_topic": total_answers,
                    "matched_question_ids": [q.id for _, q, _ in matched_items],
                    "matched_answers": [
                        {
                            "question_id": q.id,
                            "question_text": q.question_text,
                            "student_answer": ans.answer_text,
                            "correct_answer": q.correct_answer,
                        }
                        for ans, q, _ in matched_items
                    ],
                }

                # Check existing flag
                existing_flag = ErrorPatternFlag.query.filter_by(
                    student_id=student_id,
                    topic_id=topic_id,
                    error_tag_id=tag_id,
                ).first()

                if existing_flag:
                    existing_flag.evidence_count = total_answers
                    existing_flag.incorrect_count = total_incorrect
                    existing_flag.match_count = match_count
                    existing_flag.evidence_json = evidence
                    existing_flag.calculated_at = now
                    # Do not override reviewed or dismissed flags
                    if existing_flag.status not in ("reviewed", "dismissed", "overridden"):
                        existing_flag.status = "suspected"
                    flag = existing_flag
                else:
                    flag = ErrorPatternFlag(
                        student_id=student_id,
                        topic_id=topic_id,
                        error_tag_id=tag_id,
                        evidence_count=total_answers,
                        incorrect_count=total_incorrect,
                        match_count=match_count,
                        evidence_json=evidence,
                        status="suspected",
                        model_version=ErrorPatternService.MODEL_VERSION,
                        calculated_at=now,
                    )
                    db.session.add(flag)

                flagged_records.append(flag)

        db.session.commit()
        return [
            {
                "flag_id": f.id,
                "student_id": f.student_id,
                "topic_id": f.topic_id,
                "error_tag_id": f.error_tag_id,
                "error_tag_name": f.error_tag.name if f.error_tag else None,
                "match_count": f.match_count,
                "status": f.status,
                "calculated_at": f.calculated_at.isoformat(),
            }
            for f in flagged_records
        ]

    @staticmethod
    def get_active_flags(student_id, topic_id=None):
        """Returns suspected or confirmed error pattern flags for a student."""
        query = ErrorPatternFlag.query.filter(
            ErrorPatternFlag.student_id == student_id,
            ErrorPatternFlag.status.in_(["suspected", "reviewed"]),
        )
        if topic_id:
            query = query.filter(ErrorPatternFlag.topic_id == topic_id)

        flags = query.order_by(ErrorPatternFlag.calculated_at.desc()).all()
        return [
            {
                "id": f.id,
                "student_id": f.student_id,
                "topic_id": f.topic_id,
                "topic_title": f.topic.title if f.topic else None,
                "error_tag_id": f.error_tag_id,
                "error_tag_name": f.error_tag.name if f.error_tag else None,
                "error_tag_description": f.error_tag.description if f.error_tag else None,
                "match_count": f.match_count,
                "status": f.status,
                "evidence": f.evidence_json,
                "calculated_at": f.calculated_at.isoformat(),
            }
            for f in flags
        ]
