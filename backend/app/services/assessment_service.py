from datetime import datetime

from app.extensions import db
from app.models.academic import Subject, Topic
from app.models.assessment import Answer, Assessment, AssessmentQuestion, Attempt
from app.models.content import Question
from app.models.user import Class, Enrollment, User
from app.services.content_service import ContentService
from app.services.scoring_service import ScoringService


class AssessmentService:
    # -------------------------------------------------------------
    # Assessment Management & Querying
    # -------------------------------------------------------------
    @staticmethod
    def serialize_assessment(assessment, include_questions=False, is_student_safe=True, user_id=None):
        if assessment is None:
            return None

        data = {
            "id": assessment.id,
            "title": assessment.title,
            "assessment_type": assessment.assessment_type,
            "subject_id": assessment.subject_id,
            "topic_id": assessment.topic_id,
            "class_id": assessment.class_id,
            "status": assessment.status,
            "available_from": assessment.available_from.isoformat() if assessment.available_from else None,
            "available_until": assessment.available_until.isoformat() if assessment.available_until else None,
            "question_count": len(assessment.questions),
            "total_points": sum(float(aq.points) for aq in assessment.questions),
            "created_at": assessment.created_at.isoformat() if assessment.created_at else None,
        }

        # If user_id is provided, check student attempt status
        if user_id:
            attempt = Attempt.query.filter_by(assessment_id=assessment.id, student_id=user_id).first()
            if attempt:
                data["user_attempt"] = {
                    "attempt_id": attempt.id,
                    "status": attempt.status,
                    "score": attempt.score,
                    "percentage": attempt.percentage,
                    "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                }
            else:
                data["user_attempt"] = None

        if include_questions:
            ordered_aqs = sorted(assessment.questions, key=lambda x: x.order_index)
            data["questions"] = [
                {
                    "order_index": aq.order_index,
                    "points": float(aq.points),
                    **ContentService.serialize_question(aq.question, is_student_safe=is_student_safe),
                }
                for aq in ordered_aqs
                if aq.question is not None
            ]

        return data

    @staticmethod
    def get_assessments(class_id=None, assessment_type=None, status=None, user_role="student", user_id=None):
        query = Assessment.query

        if user_role == "student":
            if not user_id:
                return []
            active_enrollments = Enrollment.query.filter_by(student_id=user_id, status="active").all()
            enrolled_class_ids = [e.class_id for e in active_enrollments]
            if not enrolled_class_ids:
                return []

            query = query.filter(
                Assessment.class_id.in_(enrolled_class_ids),
                Assessment.status == "published",
            )
            # Check availability window
            now = datetime.utcnow()
            query = query.filter(Assessment.available_from <= now)
        else:
            if class_id:
                query = query.filter(Assessment.class_id == class_id)
            if status:
                query = query.filter(Assessment.status == status)

        if assessment_type:
            query = query.filter(Assessment.assessment_type == assessment_type)

        assessments = query.order_by(Assessment.created_at.desc()).all()
        return [
            AssessmentService.serialize_assessment(
                a, include_questions=False, is_student_safe=(user_role == "student"), user_id=user_id
            )
            for a in assessments
        ]

    @staticmethod
    def get_assessment_by_id(assessment_id, user_role="student", user_id=None):
        assessment = db.session.get(Assessment, assessment_id)
        if not assessment:
            raise LookupError(f"Assessment with ID {assessment_id} not found.")

        if user_role == "student":
            # Verify enrollment in assessment's class
            enrollment = Enrollment.query.filter_by(
                student_id=user_id, class_id=assessment.class_id, status="active"
            ).first()
            if not enrollment:
                raise PermissionError("You are not enrolled in the class for this assessment.")

            if assessment.status != "published":
                raise LookupError("Assessment is not currently published.")

            now = datetime.utcnow()
            if assessment.available_from and now < assessment.available_from:
                raise LookupError("Assessment is not yet available.")
            if assessment.available_until and now > assessment.available_until:
                raise LookupError("Assessment availability has closed.")

            return AssessmentService.serialize_assessment(
                assessment, include_questions=True, is_student_safe=True, user_id=user_id
            )

        return AssessmentService.serialize_assessment(
            assessment, include_questions=True, is_student_safe=False, user_id=user_id
        )

    @staticmethod
    def create_assessment(data, user_id=None):
        title = (data.get("title") or "").strip()
        assessment_type = (data.get("assessment_type") or "").strip().lower()
        subject_id = data.get("subject_id")
        topic_id = data.get("topic_id")
        class_id = data.get("class_id")
        status = (data.get("status") or "draft").strip().lower()
        questions = data.get("questions", [])

        if not title:
            raise ValueError("Assessment title is required.")
        if assessment_type not in ("diagnostic", "practice", "reassessment"):
            raise ValueError("assessment_type must be 'diagnostic', 'practice', or 'reassessment'.")
        if not subject_id or not db.session.get(Subject, subject_id):
            raise ValueError("A valid subject_id is required.")
        if not class_id or not db.session.get(Class, class_id):
            raise ValueError("A valid class_id is required.")
        if topic_id and not db.session.get(Topic, topic_id):
            raise ValueError("Specified topic_id does not exist.")
        if status not in ("draft", "published", "closed"):
            raise ValueError("status must be 'draft', 'published', or 'closed'.")

        existing = Assessment.query.filter_by(title=title, class_id=class_id).first()
        if existing:
            raise ValueError(f"An assessment with title '{title}' already exists for this class.")

        assessment = Assessment(
            title=title,
            assessment_type=assessment_type,
            subject_id=subject_id,
            topic_id=topic_id,
            class_id=class_id,
            status=status,
            created_by=user_id,
        )
        db.session.add(assessment)
        db.session.flush()

        # Add questions
        used_order_indices = set()
        for idx, item in enumerate(questions):
            q_id = item.get("question_id")
            order_idx = item.get("order_index", idx + 1)
            pts = float(item.get("points", 1.0))

            if not q_id or not db.session.get(Question, q_id):
                raise ValueError(f"Invalid question_id '{q_id}' at index {idx}.")
            if order_idx in used_order_indices:
                raise ValueError(f"Duplicate order_index '{order_idx}' in question list.")
            used_order_indices.add(order_idx)

            aq = AssessmentQuestion(
                assessment_id=assessment.id,
                question_id=q_id,
                order_index=order_idx,
                points=pts,
            )
            db.session.add(aq)

        db.session.commit()
        return AssessmentService.serialize_assessment(assessment, include_questions=True, is_student_safe=False)

    @staticmethod
    def update_assessment_status(assessment_id, status):
        assessment = db.session.get(Assessment, assessment_id)
        if not assessment:
            raise LookupError(f"Assessment with ID {assessment_id} not found.")

        status = str(status).strip().lower()
        if status not in ("draft", "published", "closed"):
            raise ValueError("status must be 'draft', 'published', or 'closed'.")

        assessment.status = status
        assessment.updated_at = datetime.utcnow()
        db.session.commit()
        return {"id": assessment.id, "status": assessment.status}

    # -------------------------------------------------------------
    # Attempt Lifecycle & Answer Submission
    # -------------------------------------------------------------
    @staticmethod
    def start_attempt(assessment_id, student_id):
        """
        Starts or resumes an attempt for a student on an assessment.
        Ensures active class enrollment, publication status, availability window,
        and idempotency.
        """
        assessment = db.session.get(Assessment, assessment_id)
        if not assessment:
            raise LookupError(f"Assessment with ID {assessment_id} not found.")

        # 1. Enrolment check
        enrollment = Enrollment.query.filter_by(
            student_id=student_id, class_id=assessment.class_id, status="active"
        ).first()
        if not enrollment:
            raise PermissionError("Student is not enrolled in this assessment's class.")

        # 2. Availability check
        if assessment.status != "published":
            raise ValueError("Assessment is not currently published.")

        now = datetime.utcnow()
        if assessment.available_from and now < assessment.available_from:
            raise ValueError("Assessment is not yet available.")
        if assessment.available_until and now > assessment.available_until:
            raise ValueError("Assessment availability has closed.")

        # 3. Idempotency check
        existing_attempt = Attempt.query.filter_by(
            assessment_id=assessment_id, student_id=student_id
        ).first()

        if existing_attempt:
            if existing_attempt.status == "in_progress":
                return AssessmentService._serialize_attempt_session(existing_attempt)
            raise ValueError("Assessment has already been submitted.")

        # 4. Create new attempt
        attempt = Attempt(
            assessment_id=assessment_id,
            student_id=student_id,
            attempt_type=assessment.assessment_type,
            status="in_progress",
            started_at=now,
        )
        db.session.add(attempt)
        db.session.commit()
        return AssessmentService._serialize_attempt_session(attempt)

    @staticmethod
    def _serialize_attempt_session(attempt):
        """Serializes an in-progress attempt with student-safe questions and saved answers."""
        assessment = attempt.assessment
        saved_answers = {ans.question_id: ans.answer_text for ans in attempt.answers}
        time_spent_map = {ans.question_id: ans.time_spent_seconds for ans in attempt.answers}

        ordered_aqs = sorted(assessment.questions, key=lambda x: x.order_index)
        questions = [
            {
                "order_index": aq.order_index,
                "points": float(aq.points),
                "saved_answer": saved_answers.get(aq.question_id),
                "time_spent_seconds": time_spent_map.get(aq.question_id, 0),
                **ContentService.serialize_question(aq.question, is_student_safe=True),
            }
            for aq in ordered_aqs
            if aq.question is not None
        ]

        return {
            "attempt_id": attempt.id,
            "assessment_id": assessment.id,
            "assessment_title": assessment.title,
            "attempt_type": attempt.attempt_type,
            "status": attempt.status,
            "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
            "total_questions": len(questions),
            "questions": questions,
        }

    @staticmethod
    def save_answer(attempt_id, question_id, answer_text, time_spent_seconds, student_id):
        """
        Autosaves / upserts a student's answer for a single question.
        Enforces ownership, in_progress status, and assessment question bounds.
        """
        attempt = db.session.get(Attempt, attempt_id)
        if not attempt:
            raise LookupError(f"Attempt with ID {attempt_id} not found.")

        if attempt.student_id != student_id:
            raise PermissionError("You cannot modify answers for another student's attempt.")

        if attempt.status != "in_progress":
            raise ValueError(f"Cannot save answer: attempt is already {attempt.status}.")

        # Check that question_id belongs to the assessment
        valid_qids = {aq.question_id for aq in attempt.assessment.questions}
        if question_id not in valid_qids:
            raise ValueError(f"Question ID {question_id} does not belong to this assessment.")

        answer = Answer.query.filter_by(attempt_id=attempt_id, question_id=question_id).first()
        if not answer:
            answer = Answer(
                attempt_id=attempt_id,
                question_id=question_id,
                answer_text=str(answer_text).strip() if answer_text is not None else None,
                time_spent_seconds=max(0, int(time_spent_seconds or 0)),
            )
            db.session.add(answer)
        else:
            answer.answer_text = str(answer_text).strip() if answer_text is not None else None
            answer.time_spent_seconds = max(0, answer.time_spent_seconds + int(time_spent_seconds or 0))
            answer.updated_at = datetime.utcnow()

        db.session.commit()
        return {
            "saved": True,
            "attempt_id": attempt.id,
            "question_id": question_id,
            "answer_text": answer.answer_text,
            "time_spent_seconds": answer.time_spent_seconds,
        }

    @staticmethod
    def submit_attempt(attempt_id, student_id):
        """
        Transactionally scores and finalizes an in-progress attempt.
        Prevents post-submission changes and ensures idempotent returns.
        """
        attempt = db.session.get(Attempt, attempt_id)
        if not attempt:
            raise LookupError(f"Attempt with ID {attempt_id} not found.")

        if attempt.student_id != student_id:
            raise PermissionError("You cannot submit another student's attempt.")

        if attempt.status != "in_progress":
            if attempt.status == "scored":
                # Idempotent: return existing result
                return AssessmentService.get_attempt_result(attempt_id, user_role="student", user_id=student_id)
            raise ValueError(f"Attempt is already {attempt.status} and cannot be submitted.")

        # Transactional scoring
        ScoringService.score_attempt(attempt)
        db.session.commit()

        # Trigger explainable learning intelligence pipeline (fail-safe and observable)
        try:
            from app.services.mastery_service import MasteryService
            from app.services.error_pattern_service import ErrorPatternService
            from app.services.recommendation_service import RecommendationService

            topics_in_assessment = {
                aq.question.topic_id
                for aq in attempt.assessment.questions
                if aq.question and aq.question.topic_id
            }
            for t_id in topics_in_assessment:
                MasteryService.calculate_and_persist_mastery(student_id, t_id)
                ErrorPatternService.detect_and_persist_flags(student_id, t_id)
                RecommendationService.generate_recommendations(student_id, t_id)
        except Exception as e:
            from flask import current_app
            current_app.logger.error("Learning intelligence pipeline encountered an error: %s", e)

        return AssessmentService.get_attempt_result(attempt_id, user_role="student", user_id=student_id)

    @staticmethod
    def get_attempt_result(attempt_id, user_role="student", user_id=None):
        """
        Retrieves post-submission results with question breakdowns, correct answers,
        explanations, and detected misconception error tags.
        """
        attempt = db.session.get(Attempt, attempt_id)
        if not attempt:
            raise LookupError(f"Attempt with ID {attempt_id} not found.")

        if user_role == "student" and attempt.student_id != user_id:
            raise PermissionError("You cannot view results for another student's attempt.")

        if attempt.status not in ("submitted", "scored"):
            raise ValueError("Results are only available after final assessment submission.")

        assessment = attempt.assessment
        aq_map = {aq.question_id: aq for aq in assessment.questions}
        answers_by_qid = {ans.question_id: ans for ans in attempt.answers}

        ordered_aqs = sorted(assessment.questions, key=lambda x: x.order_index)
        question_breakdown = []

        for aq in ordered_aqs:
            q = aq.question
            ans = answers_by_qid.get(aq.question_id)
            detected_tag = None
            if ans and ans.detected_error_tag_id:
                # Resolve error tag name
                from app.models.content import ErrorTag
                tag_obj = db.session.get(ErrorTag, ans.detected_error_tag_id)
                if tag_obj:
                    detected_tag = {
                        "id": tag_obj.id,
                        "name": tag_obj.name,
                        "description": tag_obj.description,
                    }

            question_breakdown.append({
                "question_id": q.id,
                "order_index": aq.order_index,
                "points_possible": float(aq.points),
                "points_earned": float(aq.points) if (ans and ans.is_correct) else 0.0,
                "is_correct": ans.is_correct if ans else False,
                "student_answer": ans.answer_text if ans else None,
                "correct_answer": q.correct_answer,
                "question_text": q.question_text,
                "options": q.options_json or [],
                "explanation": q.explanation,
                "hint": q.hint,
                "time_spent_seconds": ans.time_spent_seconds if ans else 0,
                "detected_error_tag": detected_tag,
            })

        total_time_seconds = sum(item["time_spent_seconds"] for item in question_breakdown)

        return {
            "attempt_id": attempt.id,
            "assessment_id": assessment.id,
            "assessment_title": assessment.title,
            "assessment_type": assessment.assessment_type,
            "student_id": attempt.student_id,
            "student_name": attempt.student.name if attempt.student else None,
            "status": attempt.status,
            "score": attempt.score,
            "percentage": attempt.percentage,
            "total_points_possible": sum(item["points_possible"] for item in question_breakdown),
            "total_points_earned": sum(item["points_earned"] for item in question_breakdown),
            "total_time_spent_seconds": total_time_seconds,
            "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "questions": question_breakdown,
        }
