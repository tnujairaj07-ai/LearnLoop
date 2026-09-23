import math
from datetime import datetime

from app.extensions import db


class ScoringService:
    @staticmethod
    def evaluate_answer(question, answer_text):
        """
        Deterministically evaluates student answer against question.correct_answer.
        Returns:
            is_correct (bool): True if answer matches the expected criteria.
            detected_error_tag_id (int | None): ID of matched misconception tag if incorrect.
        """
        if question is None:
            return False, None

        if answer_text is None or str(answer_text).strip() == "":
            return False, None

        ans_str = str(answer_text).strip()
        correct_str = str(question.correct_answer).strip()
        q_type = (question.question_type or "mcq").lower()

        is_correct = False

        if q_type == "mcq":
            # Case-insensitive match on selected option identifier (e.g. 'a', 'b', 'c', 'd')
            is_correct = (ans_str.lower() == correct_str.lower())
        elif q_type == "numeric":
            try:
                # Compare numerically with floating point tolerance
                val_user = float(ans_str)
                val_correct = float(correct_str)
                is_correct = math.isclose(val_user, val_correct, rel_tol=1e-5, abs_tol=1e-5)
            except (ValueError, TypeError):
                is_correct = (ans_str.lower() == correct_str.lower())
        else:
            # short_text: normalized case-insensitive comparison
            is_correct = (ans_str.lower() == correct_str.lower())

        detected_error_tag_id = None
        if not is_correct and question.error_tags:
            # Check if student's incorrect option or answer matches a known error pattern
            for qet in question.error_tags:
                if qet.option_or_pattern:
                    pattern = str(qet.option_or_pattern).strip().lower()
                    if ans_str.lower() == pattern:
                        detected_error_tag_id = qet.error_tag_id
                        break

        return is_correct, detected_error_tag_id

    @staticmethod
    def score_attempt(attempt):
        """
        Scores an attempt transactionally across all questions in its assessment.
        Calculates earned score, percentage, detected error tags, and updates
        attempt status to 'scored'.
        """
        assessment = attempt.assessment
        if not assessment:
            raise LookupError("Assessment not associated with attempt.")

        # Map assessment questions by question_id
        aq_map = {aq.question_id: aq for aq in assessment.questions}
        answers_by_qid = {ans.question_id: ans for ans in attempt.answers}

        total_points_earned = 0.0
        total_possible_points = 0.0

        for q_id, aq in aq_map.items():
            pts = float(aq.points)
            total_possible_points += pts

            ans = answers_by_qid.get(q_id)
            if ans and ans.answer_text is not None and str(ans.answer_text).strip() != "":
                is_correct, detected_tag_id = ScoringService.evaluate_answer(aq.question, ans.answer_text)
                ans.is_correct = is_correct
                ans.detected_error_tag_id = detected_tag_id
                if is_correct:
                    total_points_earned += pts
            elif ans:
                ans.is_correct = False
                ans.detected_error_tag_id = None

        attempt.score = round(total_points_earned, 2)
        if total_possible_points > 0:
            attempt.percentage = round((total_points_earned / total_possible_points) * 100.0, 2)
        else:
            attempt.percentage = 0.0

        attempt.status = "scored"
        attempt.submitted_at = datetime.utcnow()
        attempt.updated_at = datetime.utcnow()

        return attempt
