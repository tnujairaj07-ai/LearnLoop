from datetime import datetime

from app.extensions import db
from app.models.academic import Topic
from app.models.assessment import Attempt
from app.models.governance import LearningGainRecord
from app.models.intervention import Intervention, InterventionStudent
from app.models.mastery import ErrorPatternFlag, ErrorPatternReview
from app.models.user import Enrollment, TeacherAssignment, User
from app.services.analytics_service import AnalyticsService
from app.services.mastery_service import MasteryService


class InterventionService:
    @staticmethod
    def generate_suggested_interventions(teacher_id, class_id):
        """
        Scans class diagnostic data to propose evidence-backed teacher interventions:
        - Class topic average mastery < 60%
        - Or cluster of >= 2 students exhibiting the same recurrent misconception
        """
        AnalyticsService.verify_teacher_class_access(teacher_id, class_id)

        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        student_ids = [e.student_id for e in enrollments]
        if not student_ids:
            return []

        topics = Topic.query.order_by(Topic.order_index.asc()).all()
        suggested = []

        for t in topics:
            scores = []
            low_mastery_students = []
            for sid in student_ids:
                m = MasteryService.get_latest_mastery(sid, t.id)
                scores.append(m["mastery_score"])
                if m["mastery_score"] < 60.0:
                    low_mastery_students.append(sid)

            avg_mastery = round(sum(scores) / float(len(scores)), 1) if scores else 0.0

            # Check recurrent error pattern flags for this topic
            error_flags = (
                ErrorPatternFlag.query.filter(
                    ErrorPatternFlag.student_id.in_(student_ids),
                    ErrorPatternFlag.topic_id == t.id,
                    ErrorPatternFlag.status.in_(["suspected", "reviewed"]),
                ).all()
            )
            flagged_students = list({f.student_id for f in error_flags})

            # Check if threshold met
            requires_intervention = (avg_mastery < 60.0 and len(low_mastery_students) >= 1) or len(flagged_students) >= 2

            if requires_intervention:
                # Check if an active/suggested intervention already exists
                existing = (
                    Intervention.query.filter_by(class_id=class_id, topic_id=t.id)
                    .filter(
                        Intervention.status.in_([
                            "suggested",
                            "reviewed",
                            "assigned",
                            "in_progress",
                            "reassessment_pending",
                        ])
                    )
                    .first()
                )

                if existing:
                    suggested.append(existing)
                    continue

                affected_ids = list(set(low_mastery_students + flagged_students))
                error_summary = [f.error_tag.name for f in error_flags if f.error_tag]

                reason_text = (
                    f"Class average mastery for {t.title} is {avg_mastery}% (Developing/Needs support). "
                    f"{len(affected_ids)} of {len(student_ids)} students require targeted instructional reinforcement."
                )
                if error_summary:
                    unique_tags = list(set(error_summary))
                    reason_text += f" Recurrent tagged misconceptions detected: {', '.join(unique_tags)}."

                recommended_action = (
                    f"1. Conduct a 20-minute targeted classroom review on {t.title}.\n"
                    f"2. Assign focused practice exercises targeting core skills.\n"
                    f"3. Administer a post-intervention reassessment to measure learning gain."
                )

                intervention = Intervention(
                    teacher_id=teacher_id,
                    class_id=class_id,
                    subject_id=t.subject_id,
                    topic_id=t.id,
                    title=f"Targeted Intervention: {t.title} Mastery Support",
                    reason=reason_text,
                    evidence_json={
                        "class_average_mastery": avg_mastery,
                        "affected_students_count": len(affected_ids),
                        "affected_student_ids": affected_ids,
                        "detected_error_tags": list(set(error_summary)),
                    },
                    recommended_action=recommended_action,
                    status="suggested",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.session.add(intervention)
                db.session.commit()
                suggested.append(intervention)

        return suggested

    @staticmethod
    def list_interventions(teacher_id, class_id=None, status=None, topic_id=None):
        """Lists interventions for the teacher with optional class, status, and topic filters."""
        query = Intervention.query

        if class_id:
            AnalyticsService.verify_teacher_class_access(teacher_id, class_id)
            query = query.filter_by(class_id=class_id)
        else:
            assignments = TeacherAssignment.query.filter_by(teacher_id=teacher_id).all()
            assigned_class_ids = [ta.class_id for ta in assignments]
            query = query.filter(Intervention.class_id.in_(assigned_class_ids))

        if status:
            query = query.filter_by(status=status)
        if topic_id:
            query = query.filter_by(topic_id=topic_id)

        interventions = query.order_by(Intervention.created_at.desc()).all()

        return [
            {
                "id": inv.id,
                "teacher_id": inv.teacher_id,
                "class_id": inv.class_id,
                "subject_id": inv.subject_id,
                "topic_id": inv.topic_id,
                "topic_title": inv.topic.title if hasattr(inv, "topic") and inv.topic else None,
                "title": inv.title,
                "reason": inv.reason,
                "evidence": inv.evidence_json,
                "recommended_action": inv.recommended_action,
                "status": inv.status,
                "reassessment_id": inv.reassessment_id,
                "assigned_students_count": len(inv.students),
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "assigned_at": inv.assigned_at.isoformat() if inv.assigned_at else None,
                "completed_at": inv.completed_at.isoformat() if inv.completed_at else None,
            }
            for inv in interventions
        ]

    @staticmethod
    def get_intervention_details(teacher_id, intervention_id):
        """Returns full details of an intervention including assigned student roster and outcomes."""
        inv = Intervention.query.get(intervention_id)
        if not inv:
            raise ValueError(f"Intervention with ID {intervention_id} not found.")

        AnalyticsService.verify_teacher_class_access(teacher_id, inv.class_id)

        students_data = []
        for ist in inv.students:
            student = ist.student
            students_data.append({
                "student_id": ist.student_id,
                "student_name": student.name if student else None,
                "student_email": student.email if student else None,
                "before_mastery": ist.before_mastery,
                "after_mastery": ist.after_mastery,
                "outcome": ist.outcome,
                "status": ist.status,
                "assigned_at": ist.assigned_at.isoformat() if ist.assigned_at else None,
                "completed_at": ist.completed_at.isoformat() if ist.completed_at else None,
            })

        return {
            "id": inv.id,
            "teacher_id": inv.teacher_id,
            "class_id": inv.class_id,
            "subject_id": inv.subject_id,
            "topic_id": inv.topic_id,
            "topic_title": inv.topic.title if hasattr(inv, "topic") and inv.topic else None,
            "title": inv.title,
            "reason": inv.reason,
            "evidence": inv.evidence_json,
            "recommended_action": inv.recommended_action,
            "status": inv.status,
            "reassessment_id": inv.reassessment_id,
            "assigned_students": students_data,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "assigned_at": inv.assigned_at.isoformat() if inv.assigned_at else None,
            "completed_at": inv.completed_at.isoformat() if inv.completed_at else None,
        }

    @staticmethod
    def create_intervention(teacher_id, data):
        """Manually creates a new intervention proposal."""
        class_id = data.get("class_id")
        topic_id = data.get("topic_id")
        title = data.get("title")
        reason = data.get("reason")
        recommended_action = data.get("recommended_action")

        if not all([class_id, topic_id, title, reason, recommended_action]):
            raise ValueError("class_id, topic_id, title, reason, and recommended_action are required.")

        AnalyticsService.verify_teacher_class_access(teacher_id, class_id)

        topic = Topic.query.get(topic_id)
        if not topic:
            raise ValueError(f"Topic with ID {topic_id} not found.")

        subject_id = data.get("subject_id") or topic.subject_id

        inv = Intervention(
            teacher_id=teacher_id,
            class_id=class_id,
            subject_id=subject_id,
            topic_id=topic_id,
            skill_id=data.get("skill_id"),
            title=title,
            reason=reason,
            evidence_json=data.get("evidence", {}),
            recommended_action=recommended_action,
            reassessment_id=data.get("reassessment_id"),
            status=data.get("status", "suggested"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.session.add(inv)
        db.session.commit()
        return InterventionService.get_intervention_details(teacher_id, inv.id)

    @staticmethod
    def update_intervention(teacher_id, intervention_id, data):
        """Updates editable fields or status of an intervention."""
        inv = Intervention.query.get(intervention_id)
        if not inv:
            raise ValueError(f"Intervention with ID {intervention_id} not found.")

        AnalyticsService.verify_teacher_class_access(teacher_id, inv.class_id)

        if "title" in data:
            inv.title = data["title"]
        if "reason" in data:
            inv.reason = data["reason"]
        if "recommended_action" in data:
            inv.recommended_action = data["recommended_action"]
        if "reassessment_id" in data:
            inv.reassessment_id = data["reassessment_id"]
        if "status" in data:
            valid_statuses = [
                "suggested",
                "reviewed",
                "assigned",
                "in_progress",
                "reassessment_pending",
                "completed",
                "closed",
                "dismissed",
            ]
            if data["status"] not in valid_statuses:
                raise ValueError(f"Invalid status: {data['status']}")
            inv.status = data["status"]

        inv.updated_at = datetime.utcnow()
        db.session.commit()
        return InterventionService.get_intervention_details(teacher_id, inv.id)

    @staticmethod
    def assign_intervention(teacher_id, intervention_id, student_ids=None):
        """
        Assigns an intervention to class students and records baseline before_mastery.
        If student_ids is empty or None, assigns to all active students in the class.
        """
        inv = Intervention.query.get(intervention_id)
        if not inv:
            raise ValueError(f"Intervention with ID {intervention_id} not found.")

        AnalyticsService.verify_teacher_class_access(teacher_id, inv.class_id)

        if not student_ids:
            enrollments = Enrollment.query.filter_by(class_id=inv.class_id, status="active").all()
            target_student_ids = [e.student_id for e in enrollments]
        else:
            target_student_ids = student_ids

        now = datetime.utcnow()
        for sid in target_student_ids:
            existing = InterventionStudent.query.filter_by(
                intervention_id=inv.id, student_id=sid
            ).first()
            if not existing:
                m = MasteryService.get_latest_mastery(sid, inv.topic_id)
                before_m = m["mastery_score"] if m["evidence_count"] > 0 else 0.0

                ist = InterventionStudent(
                    intervention_id=inv.id,
                    student_id=sid,
                    before_mastery=before_m,
                    status="assigned",
                    assigned_at=now,
                )
                db.session.add(ist)

        inv.status = "assigned"
        inv.assigned_at = now
        inv.updated_at = now
        db.session.commit()

        try:
            from app.services.audit_service import AuditService
            AuditService.log_event(
                action="intervention.assign",
                entity_type="Intervention",
                entity_id=inv.id,
                actor_id=teacher_id,
                metadata_json={
                    "class_id": inv.class_id,
                    "topic_id": inv.topic_id,
                    "assigned_students_count": len(target_student_ids),
                },
                commit=True,
            )
        except Exception:
            pass

        return InterventionService.get_intervention_details(teacher_id, inv.id)

    @staticmethod
    def complete_intervention(teacher_id, intervention_id, reassessment_id=None):
        """
        Marks an intervention as completed, evaluates post-mastery and reassessment scores,
        calculates Hake's normalized learning gain, and records outcomes.
        """
        inv = Intervention.query.get(intervention_id)
        if not inv:
            raise ValueError(f"Intervention with ID {intervention_id} not found.")

        AnalyticsService.verify_teacher_class_access(teacher_id, inv.class_id)

        if reassessment_id:
            inv.reassessment_id = reassessment_id

        target_reassessment = inv.reassessment_id
        now = datetime.utcnow()

        for ist in inv.students:
            # Evaluate after-mastery
            m = MasteryService.get_latest_mastery(ist.student_id, inv.topic_id)
            after_m = m["mastery_score"]
            ist.after_mastery = after_m

            # Calculate reassessment scores & learning gains if reassessment exists
            gain_val = None
            if target_reassessment:
                reassess_att = (
                    Attempt.query.filter_by(
                        assessment_id=target_reassessment, student_id=ist.student_id
                    )
                    .filter(Attempt.status.in_(["submitted", "scored"]))
                    .order_by(Attempt.submitted_at.desc())
                    .first()
                )

                if reassess_att:
                    post_score = reassess_att.percentage
                    # Locate baseline pre-test attempt
                    pre_att = (
                        Attempt.query.filter(
                            Attempt.student_id == ist.student_id,
                            Attempt.assessment_id != target_reassessment,
                        )
                        .filter(Attempt.status.in_(["submitted", "scored"]))
                        .order_by(Attempt.submitted_at.asc())
                        .first()
                    )

                    if pre_att:
                        pre_score = pre_att.percentage

                        # Hake's Normalized Learning Gain
                        if pre_score >= 100.0:
                            gain_val = 1.0 if post_score >= 100.0 else 0.0
                        else:
                            gain_val = round((post_score - pre_score) / (100.0 - pre_score), 3)

                        # Record LearningGainRecord
                        existing_gain = LearningGainRecord.query.filter_by(
                            diagnostic_attempt_id=pre_att.id,
                            reassessment_attempt_id=reassess_att.id,
                        ).first()

                        if not existing_gain:
                            lgr = LearningGainRecord(
                                student_id=ist.student_id,
                                topic_id=inv.topic_id,
                                intervention_id=inv.id,
                                diagnostic_attempt_id=pre_att.id,
                                reassessment_attempt_id=reassess_att.id,
                                pre_score=pre_score,
                                post_score=post_score,
                                score_gain=round(post_score - pre_score, 2),
                                before_mastery=ist.before_mastery,
                                after_mastery=after_m,
                                mastery_gain=round(after_m - (ist.before_mastery or 0.0), 2),
                                calculation_version="hake-gain-v1",
                                calculated_at=now,
                            )
                            db.session.add(lgr)

            # Categorize student outcome constructively
            mastery_delta = round(after_m - (ist.before_mastery or 0.0), 2)
            if mastery_delta >= 25.0 or (gain_val is not None and gain_val >= 0.5):
                outcome = "Strong improvement"
            elif mastery_delta >= 10.0 or (gain_val is not None and gain_val >= 0.2):
                outcome = "Moderate improvement"
            elif mastery_delta >= -5.0:
                outcome = "Minimal/No change"
            else:
                outcome = "Needs further support"

            ist.outcome = outcome
            ist.status = "completed"
            ist.completed_at = now

        inv.status = "completed"
        inv.completed_at = now
        inv.updated_at = now
        db.session.commit()

        try:
            from app.services.audit_service import AuditService
            AuditService.log_event(
                action="intervention.complete",
                entity_type="Intervention",
                entity_id=inv.id,
                actor_id=teacher_id,
                metadata_json={
                    "class_id": inv.class_id,
                    "topic_id": inv.topic_id,
                    "reassessment_id": target_reassessment,
                    "students_count": len(inv.students),
                },
                commit=True,
            )
        except Exception:
            pass

        return InterventionService.get_intervention_details(teacher_id, inv.id)

    @staticmethod
    def get_intervention_outcomes(teacher_id, intervention_id):
        """Computes and returns class-level outcome metrics and pre/post comparison for an intervention."""
        inv = Intervention.query.get(intervention_id)
        if not inv:
            raise ValueError(f"Intervention with ID {intervention_id} not found.")

        AnalyticsService.verify_teacher_class_access(teacher_id, inv.class_id)

        students_summary = []
        mastery_deltas = []
        outcome_distribution = {
            "Strong improvement": 0,
            "Moderate improvement": 0,
            "Minimal/No change": 0,
            "Needs further support": 0,
        }

        for ist in inv.students:
            student = ist.student
            before = ist.before_mastery or 0.0
            after = ist.after_mastery or 0.0
            delta = round(after - before, 2)
            mastery_deltas.append(delta)

            outcome_label = ist.outcome or "Pending reassessment"
            if outcome_label in outcome_distribution:
                outcome_distribution[outcome_label] += 1

            students_summary.append({
                "student_id": ist.student_id,
                "student_name": student.name if student else None,
                "before_mastery": ist.before_mastery,
                "after_mastery": ist.after_mastery,
                "mastery_gain": delta,
                "outcome": outcome_label,
                "status": ist.status,
            })

        avg_mastery_gain = (
            round(sum(mastery_deltas) / float(len(mastery_deltas)), 2)
            if mastery_deltas
            else 0.0
        )

        return {
            "intervention_id": inv.id,
            "title": inv.title,
            "topic_id": inv.topic_id,
            "topic_title": inv.topic.title if hasattr(inv, "topic") and inv.topic else None,
            "reassessment_id": inv.reassessment_id,
            "status": inv.status,
            "total_assigned_students": len(inv.students),
            "average_mastery_gain": avg_mastery_gain,
            "outcome_distribution": outcome_distribution,
            "students": students_summary,
        }

    @staticmethod
    def review_error_pattern(teacher_id, flag_id, decision, comments=None):
        """
        Enables teacher oversight to confirm, dismiss, or override a suspected student error pattern.
        Records an audit review in ErrorPatternReview and updates flag status.
        """
        flag = ErrorPatternFlag.query.get(flag_id)
        if not flag:
            raise ValueError(f"Error pattern flag with ID {flag_id} not found.")

        # Verify teacher teaches this student in an assigned class
        enrollment = Enrollment.query.filter_by(student_id=flag.student_id, status="active").first()
        if enrollment:
            AnalyticsService.verify_teacher_class_access(teacher_id, enrollment.class_id)

        valid_decisions = ["confirmed", "dismissed", "overridden"]
        if decision not in valid_decisions:
            raise ValueError(f"Invalid decision: {decision}. Must be one of {valid_decisions}")

        now = datetime.utcnow()
        review = ErrorPatternReview(
            error_pattern_flag_id=flag.id,
            reviewer_id=teacher_id,
            decision=decision,
            note=comments,
            created_at=now,
        )
        db.session.add(review)

        # Update flag status accordingly
        if decision == "confirmed":
            flag.status = "reviewed"
        elif decision == "dismissed":
            flag.status = "dismissed"
            flag.resolved_at = now
        elif decision == "overridden":
            flag.status = "overridden"
            flag.resolved_at = now

        db.session.commit()

        try:
            from app.services.audit_service import AuditService
            AuditService.log_event(
                action="teacher.error_pattern_review",
                entity_type="ErrorPatternFlag",
                entity_id=flag.id,
                actor_id=teacher_id,
                metadata_json={
                    "decision": decision,
                    "student_id": flag.student_id,
                    "note": comments,
                },
                commit=True,
            )
        except Exception:
            pass

        return {
            "flag_id": flag.id,
            "student_id": flag.student_id,
            "error_tag_id": flag.error_tag_id,
            "tag_name": flag.error_tag.name if flag.error_tag else None,
            "decision": decision,
            "status": flag.status,
            "comments": comments,
            "reviewed_at": now.isoformat(),
        }
