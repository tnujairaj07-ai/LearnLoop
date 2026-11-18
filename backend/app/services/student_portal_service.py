"""Student portal service handling dashboard enrichment, roadmaps, practice hub,
weekly progress, activity heatmaps, tasks, reminders, and report card bundles.
"""

from datetime import date, datetime, timedelta

from app.extensions import db
from app.models.academic import Prerequisite, Resource, ResourceView, Skill, Subject, SubjectBookmark, Topic
from app.models.assessment import Answer, Assessment, AssessmentQuestion, Attempt
from app.models.content import Question
from app.models.engagement import (
    Achievement,
    AttendanceRecord,
    ClassAnnouncement,
    ClassEvent,
    StudentAchievement,
    StudentDailyActivity,
    StudentReminder,
    StudentTask,
    StudySession,
    TeacherFeedback,
)
from app.models.governance import LearningGainRecord, Report
from app.models.mastery import ErrorPatternFlag, MasteryRecord
from app.models.user import Enrollment, User
from app.services.analytics_service import AnalyticsService
from app.services.mastery_service import MasteryService
from app.services.report_service import ReportService


class StudentPortalService:
    """Service layer powering all student-facing live portal pages."""

    @staticmethod
    def _infer_time_slot(hour):
        if hour < 12:
            return "morning"
        if hour < 17:
            return "afternoon"
        return "evening"

    @staticmethod
    def _calculate_streaks(active_dates, today_date=None):
        """Calculate current consecutive streak and longest streak from activity dates."""
        if not active_dates:
            return 0, 0

        today_date = today_date or datetime.utcnow().date()
        date_set = set(active_dates)

        # Current streak: starts today if active today, else yesterday if active yesterday
        if today_date in date_set:
            cursor = today_date
        elif (today_date - timedelta(days=1)) in date_set:
            cursor = today_date - timedelta(days=1)
        else:
            cursor = None

        current_streak = 0
        while cursor is not None and cursor in date_set:
            current_streak += 1
            cursor -= timedelta(days=1)

        sorted_dates = sorted(date_set)
        longest_streak = 0
        run = 0
        prev_day = None
        for d in sorted_dates:
            if prev_day is not None and (d - prev_day).days == 1:
                run += 1
            else:
                run = 1
            if run > longest_streak:
                longest_streak = run
            prev_day = d

        return current_streak, longest_streak

    @staticmethod
    def _activity_level(questions_count):
        if questions_count <= 0:
            return 0
        if questions_count <= 5:
            return 1
        if questions_count <= 10:
            return 2
        if questions_count <= 15:
            return 3
        return 4

    @staticmethod
    def _build_activity_heatmap(student_id, days=365):
        """Return per-day activity heatmap rollups strictly isolated to student_id."""
        today_date = datetime.utcnow().date()
        start_date = today_date - timedelta(days=max(1, days) - 1)

        rows = (
            StudentDailyActivity.query.filter_by(student_id=student_id)
            .filter(StudentDailyActivity.activity_date >= start_date)
            .order_by(StudentDailyActivity.activity_date.asc())
            .all()
        )
        all_rows = StudentDailyActivity.query.filter_by(student_id=student_id).all()
        all_dates = [r.activity_date for r in all_rows if r.questions_answered > 0 or r.active_minutes > 0]
        current_streak, longest_streak = StudentPortalService._calculate_streaks(all_dates, today_date)

        row_by_date = {r.activity_date: r for r in rows}
        day_entries = []
        total_questions = 0
        active_days_count = 0

        for offset in range(days):
            d = start_date + timedelta(days=offset)
            rec = row_by_date.get(d)
            if rec and (rec.questions_answered > 0 or rec.active_minutes > 0):
                q_count = int(rec.questions_answered or 0)
                c_count = int(rec.correct_count or 0)
                acc = round((c_count / float(q_count)) * 100.0, 1) if q_count > 0 else 0.0
                total_questions += q_count
                active_days_count += 1
                day_entries.append({
                    "date": d.isoformat(),
                    "count": q_count,
                    "correct_count": c_count,
                    "tasks_completed": int(rec.tasks_completed or 0),
                    "active_minutes": int(rec.active_minutes or 0),
                    "accuracy": acc,
                    "level": StudentPortalService._activity_level(q_count),
                    "topic": rec.primary_topic.title if rec.primary_topic else None,
                })
            else:
                day_entries.append({
                    "date": d.isoformat(),
                    "count": 0,
                    "correct_count": 0,
                    "tasks_completed": 0,
                    "active_minutes": 0,
                    "accuracy": 0.0,
                    "level": 0,
                    "topic": None,
                })

        return {
            "total_questions": total_questions,
            "active_days_count": active_days_count,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "days": day_entries,
        }

    @staticmethod
    def _upsert_daily_activity(
        student_id,
        activity_date,
        questions_delta=0,
        correct_delta=0,
        tasks_delta=0,
        minutes_delta=0,
        primary_topic_id=None,
    ):
        daily = StudentDailyActivity.query.filter_by(
            student_id=student_id, activity_date=activity_date
        ).first()
        if not daily:
            daily = StudentDailyActivity(
                student_id=student_id,
                activity_date=activity_date,
                questions_answered=0,
                correct_count=0,
                tasks_completed=0,
                active_minutes=0,
                primary_topic_id=primary_topic_id,
            )
            db.session.add(daily)
        daily.questions_answered = max(0, int(daily.questions_answered or 0) + int(questions_delta))
        daily.correct_count = max(0, int(daily.correct_count or 0) + int(correct_delta))
        daily.tasks_completed = max(0, int(daily.tasks_completed or 0) + int(tasks_delta))
        daily.active_minutes = max(0, int(daily.active_minutes or 0) + int(minutes_delta))
        if primary_topic_id and not daily.primary_topic_id:
            daily.primary_topic_id = primary_topic_id
        daily.updated_at = datetime.utcnow()
        return daily

    @staticmethod
    def _award_achievement_by_code(student_id, code, source="live_milestone"):
        ach = Achievement.query.filter_by(code=code).first()
        if not ach:
            return None
        existing = StudentAchievement.query.filter_by(
            student_id=student_id, achievement_id=ach.id
        ).first()
        if existing:
            return None
        sa = StudentAchievement(
            student_id=student_id,
            achievement_id=ach.id,
            awarded_at=datetime.utcnow(),
            metadata_json={"source": source},
        )
        db.session.add(sa)
        return sa

    @staticmethod
    def record_attempt_engagement(attempt):
        """Record StudySession, StudentDailyActivity, and milestone Achievements on attempt submission."""
        if not attempt or not attempt.assessment:
            return

        student_id = attempt.student_id
        assessment = attempt.assessment
        now = attempt.submitted_at or datetime.utcnow()
        act_date = now.date()

        answers = list(attempt.answers)
        answered = [a for a in answers if a.answer_text is not None and str(a.answer_text).strip() != ""]
        questions_count = len(answered) if answered else len(assessment.questions)
        correct_count = sum(1 for a in answers if a.is_correct)
        seconds_sum = sum(max(0, int(a.time_spent_seconds or 0)) for a in answers)
        duration_mins = (
            max(1, round(seconds_sum / 60.0))
            if seconds_sum > 0
            else max(1, int(assessment.estimated_minutes or 15))
        )

        primary_topic_id = assessment.topic_id
        if not primary_topic_id:
            for aq in assessment.questions:
                if aq.question and aq.question.topic_id:
                    primary_topic_id = aq.question.topic_id
                    break

        StudentPortalService._upsert_daily_activity(
            student_id=student_id,
            activity_date=act_date,
            questions_delta=questions_count,
            correct_delta=correct_count,
            tasks_delta=1,
            minutes_delta=duration_mins,
            primary_topic_id=primary_topic_id,
        )

        act_type = "quiz"
        if assessment.category == "assignment":
            act_type = "assignment"
        elif assessment.assessment_type == "practice" and assessment.category != "practice_quiz":
            act_type = "practice"

        db.session.add(
            StudySession(
                user_id=student_id,
                subject_id=assessment.subject_id,
                topic_id=primary_topic_id,
                assessment_id=assessment.id,
                activity_type=act_type,
                title=assessment.title,
                duration_minutes=duration_mins,
                score_percentage=attempt.percentage,
                platform="web",
                time_slot=StudentPortalService._infer_time_slot(now.hour),
                started_at=attempt.started_at or now,
                ended_at=now,
            )
        )

        # Evaluate dynamic achievement unlocks
        total_scored = (
            Attempt.query.filter_by(student_id=student_id)
            .filter(Attempt.status.in_(["submitted", "scored"]))
            .count()
        )
        if total_scored >= 1:
            StudentPortalService._award_achievement_by_code(student_id, "first_diagnostic")

        if any(
            m.mastery_score >= 80.0 and m.topic and m.topic.title == "Fractions"
            for m in MasteryRecord.query.filter_by(student_id=student_id).all()
        ):
            StudentPortalService._award_achievement_by_code(student_id, "fractions_mastery")

        active_dates = [
            r.activity_date
            for r in StudentDailyActivity.query.filter_by(student_id=student_id).all()
            if (r.questions_answered or 0) > 0
        ]
        cur_streak, _ = StudentPortalService._calculate_streaks(active_dates, act_date)
        if cur_streak >= 12:
            StudentPortalService._award_achievement_by_code(student_id, "streak_12_days")

        db.session.commit()

    @staticmethod
    def _get_student_enrolled_class_ids(student_id):
        return [
            e.class_id
            for e in Enrollment.query.filter_by(student_id=student_id, status="active").all()
        ]

    @staticmethod
    def get_student_dashboard_enriched(student_id):
        """Return base dashboard metrics plus live tasks, events, reminders, and chart histories."""
        base = AnalyticsService.get_student_dashboard(student_id)
        class_ids = StudentPortalService._get_student_enrolled_class_ids(student_id)

        scored_attempts = (
            Attempt.query.filter_by(student_id=student_id)
            .filter(Attempt.status.in_(["submitted", "scored"]))
            .order_by(Attempt.submitted_at.asc(), Attempt.id.asc())
            .all()
        )

        avg_score = (
            round(sum((a.percentage or 0.0) for a in scored_attempts) / float(len(scored_attempts)), 1)
            if scored_attempts
            else 0.0
        )

        attempted_assessment_ids = {a.assessment_id for a in scored_attempts}
        published_assessments = (
            Assessment.query.filter(
                Assessment.class_id.in_(class_ids),
                Assessment.status == "published",
            ).all()
            if class_ids
            else []
        )
        pending_assessments_count = sum(
            1 for a in published_assessments if a.id not in attempted_assessment_ids
        )

        tasks = (
            StudentTask.query.filter_by(student_id=student_id)
            .order_by(StudentTask.is_done.asc(), StudentTask.created_at.desc())
            .all()
        )
        open_tasks_count = sum(1 for t in tasks if not t.is_done)
        enrolled_subject_ids = {a.subject_id for a in published_assessments if a.subject_id}
        enrolled_courses_count = len(enrolled_subject_ids) if enrolled_subject_ids else (
            Subject.query.filter_by(status="active").count() if class_ids else 0
        )

        performance_history = [
            {
                "attempt": idx,
                "score": round(float(att.percentage or 0.0), 1),
                "label": (att.assessment.title[:18] if att.assessment else f"Attempt {idx}"),
                "submitted_at": att.submitted_at.isoformat() if att.submitted_at else None,
            }
            for idx, att in enumerate(scored_attempts[-8:], start=1)
        ]

        recent_results = [
            {
                "id": att.id,
                "assessment_id": att.assessment_id,
                "title": att.assessment.title if att.assessment else f"Assessment {att.assessment_id}",
                "topic": (
                    db.session.get(Topic, att.assessment.topic_id).title
                    if att.assessment and att.assessment.topic_id and db.session.get(Topic, att.assessment.topic_id)
                    else "Mathematics"
                ),
                "score": round(float(att.percentage or 0.0), 1),
                "status": "Secure" if (att.percentage or 0) >= 80 else ("Developing" if (att.percentage or 0) >= 40 else "Needs Support"),
                "date": att.submitted_at.strftime("%b %d") if att.submitted_at else None,
            }
            for att in reversed(scored_attempts[-5:])
        ]

        # Weekly rolling activity summary (last 7 days)
        today_date = datetime.utcnow().date()
        week_start = today_date - timedelta(days=6)
        week_rows = (
            StudentDailyActivity.query.filter_by(student_id=student_id)
            .filter(StudentDailyActivity.activity_date >= week_start)
            .all()
        )
        week_minutes = sum(int(r.active_minutes or 0) for r in week_rows)
        week_tasks = sum(int(r.tasks_completed or 0) for r in week_rows)
        weekly_target_mins = 240
        weekly_pct = min(100, round((week_minutes / float(weekly_target_mins)) * 100)) if week_minutes > 0 else 0

        events_q = (
            ClassEvent.query.filter(ClassEvent.class_id.in_(class_ids))
            .order_by(ClassEvent.scheduled_at.asc())
            .all()
            if class_ids
            else []
        )
        today_lessons = [
            {
                "id": ev.id,
                "time": ev.time_label or ev.scheduled_at.strftime("%I:%M %p"),
                "title": ev.title,
                "teacher": ev.teacher.name if ev.teacher else "Class Faculty",
                "topic": ev.topic_label or "Mathematics",
                "event_type": ev.event_type,
            }
            for ev in events_q
            if ev.event_type in ("lesson", "workshop")
        ]
        upcoming_events = [
            {
                "id": ev.id,
                "title": ev.title,
                "datetime": ev.time_label or ev.scheduled_at.strftime("%a, %I:%M %p"),
                "event_type": ev.event_type,
                "topic": ev.topic_label,
            }
            for ev in events_q
            if ev.event_type in ("clinic", "reassessment", "exam")
        ]

        reminders = (
            StudentReminder.query.filter_by(recipient_user_id=student_id)
            .order_by(StudentReminder.created_at.desc())
            .limit(10)
            .all()
        )
        announcements = (
            ClassAnnouncement.query.filter(
                ClassAnnouncement.class_id.in_(class_ids),
                ClassAnnouncement.is_active == True,
            )
            .order_by(ClassAnnouncement.updated_at.desc())
            .all()
            if class_ids
            else []
        )

        # Next recommended action derived from top Recommendation
        next_rec = None
        if base["recommendations"]:
            top_rec = base["recommendations"][0]
            next_rec = {
                "subject": "Mathematics",
                "topic_id": top_rec["topic_id"],
                "topic": top_rec["topic_title"] or "Target Topic",
                "reason": top_rec["reason"],
                "action_type": top_rec["actions"][0]["action_type"] if top_rec.get("actions") else "practice",
                "priority": top_rec["priority"],
            }

        base.update({
            "overview_stats": {
                "average_score": avg_score,
                "assessments_completed": len(scored_attempts),
                "enrolled_courses": enrolled_courses_count,
                "submitted_count": len(scored_attempts),
                "pending_count": pending_assessments_count + open_tasks_count,
            },
            "performance_history": performance_history,
            "weekly_progress": {
                "percentage": weekly_pct,
                "date_range": f"{week_start.strftime('%b %d')} - {today_date.strftime('%b %d')}",
                "active_minutes": week_minutes,
                "target_minutes": weekly_target_mins,
                "tasks_completed": week_tasks,
            },
            "recent_results": recent_results,
            "today_lessons": today_lessons,
            "events": upcoming_events,
            "upcoming_tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "is_done": t.is_done,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                }
                for t in tasks
            ],
            "reminders": [
                {
                    "id": r.id,
                    "title": r.title,
                    "message": r.message,
                    "reminder_type": r.reminder_type,
                    "is_read": r.is_read,
                    "created_at": r.created_at.isoformat(),
                }
                for r in reminders
            ],
            "announcements": [
                {
                    "id": a.id,
                    "class_id": a.class_id,
                    "message": a.message,
                    "updated_at": a.updated_at.isoformat(),
                }
                for a in announcements
            ],
            "next_recommended_action": next_rec,
        })
        return base

    @staticmethod
    def get_roadmap(student_id, category=None, search=None, bookmarked_only=False):
        """Return common curriculum subjects with per-student mastery and bookmarks."""
        subjects_query = Subject.query.order_by(Subject.id.asc())
        if category and category not in ("all", "roadmaps", "bookmarked"):
            subjects_query = subjects_query.filter_by(category=category)

        subjects = subjects_query.all()
        bookmarked_ids = {
            bm.subject_id for bm in SubjectBookmark.query.filter_by(user_id=student_id).all()
        }

        items = []
        search_lower = (search or "").strip().lower()
        for subj in subjects:
            if bookmarked_only and subj.id not in bookmarked_ids:
                continue
            if search_lower and search_lower not in subj.name.lower() and search_lower not in (subj.description or "").lower():
                continue

            topics = Topic.query.filter_by(subject_id=subj.id).all()
            assessed_scores = []
            for t in topics:
                m = MasteryService.get_latest_mastery(student_id, t.id)
                if m["evidence_count"] > 0:
                    assessed_scores.append(m["mastery_score"])

            avg_mastery = round(sum(assessed_scores) / float(len(assessed_scores)), 1) if assessed_scores else 0.0
            items.append({
                "id": subj.id,
                "code": subj.code,
                "name": subj.name,
                "curriculum": subj.curriculum_label or "CBSE Class 9",
                "description": subj.description,
                "category": subj.category,
                "status": subj.status,
                "badge": subj.badge_label,
                "icon": subj.icon,
                "topics_count": len(topics),
                "mastery": avg_mastery,
                "bookmarked": subj.id in bookmarked_ids,
            })

        return {"subjects": items, "bookmarked_ids": sorted(bookmarked_ids)}

    @staticmethod
    def toggle_subject_bookmark(student_id, subject_id):
        subj = db.session.get(Subject, subject_id)
        if not subj:
            raise LookupError(f"Subject with ID {subject_id} not found.")

        existing = SubjectBookmark.query.filter_by(user_id=student_id, subject_id=subject_id).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            return {"subject_id": subject_id, "bookmarked": False}

        bm = SubjectBookmark(user_id=student_id, subject_id=subject_id)
        db.session.add(bm)
        db.session.commit()
        return {"subject_id": subject_id, "bookmarked": True}

    @staticmethod
    def get_subject_chapters(student_id, subject_id):
        """Return ordered chapters/topics in a subject with per-student mastery, resources, and quizzes."""
        subj = db.session.get(Subject, subject_id)
        if not subj:
            raise LookupError(f"Subject with ID {subject_id} not found.")

        class_ids = StudentPortalService._get_student_enrolled_class_ids(student_id)
        reviewed_resource_ids = {
            rv.resource_id for rv in ResourceView.query.filter_by(student_id=student_id).all()
        }
        bookmarked = SubjectBookmark.query.filter_by(user_id=student_id, subject_id=subject_id).first() is not None

        topics = Topic.query.filter_by(subject_id=subject_id).order_by(Topic.order_index.asc()).all()
        chapters = []
        assessed_scores = []

        for idx, t in enumerate(topics, start=1):
            m = MasteryService.get_latest_mastery(student_id, t.id)
            if m["evidence_count"] > 0:
                assessed_scores.append(m["mastery_score"])

            if m["evidence_count"] == 0:
                ch_status = "not_started"
            elif m["mastery_score"] >= t.mastery_threshold:
                ch_status = "completed"
            else:
                ch_status = "in_progress"

            # Published assessment matching this topic in student's enrolled class
            assess_q = Assessment.query.filter_by(topic_id=t.id, status="published")
            if class_ids:
                assess_q = assess_q.filter(Assessment.class_id.in_(class_ids))
            topic_assessments = assess_q.order_by(Assessment.id.asc()).all()
            quiz_assessment = next(
                (a for a in topic_assessments if a.assessment_type == "practice"),
                topic_assessments[0] if topic_assessments else None,
            )

            approved_resources = [r for r in t.resources if r.approved]
            chapters.append({
                "id": t.id,
                "chapter_number": idx,
                "title": t.title,
                "unit": t.unit_name or subj.curriculum_label or subj.name,
                "description": t.description,
                "common_mistake": t.common_mistake_tip,
                "is_pilot": t.is_pilot,
                "order_index": t.order_index,
                "mastery": m["mastery_score"],
                "band": m["band"],
                "evidence_count": m["evidence_count"],
                "status": ch_status,
                "quiz_id": quiz_assessment.id if quiz_assessment else None,
                "subtopics": [
                    {
                        "id": sk.id,
                        "title": sk.name,
                        "cognitive_domain": sk.cognitive_domain,
                        "status": ch_status,
                        "mastery": m["mastery_score"],
                    }
                    for sk in t.skills
                ],
                "resources": [
                    {
                        "id": r.id,
                        "title": r.title,
                        "type": r.resource_type,
                        "url_or_path": r.url_or_path,
                        "description": r.description,
                        "difficulty": r.difficulty,
                        "reviewed": r.id in reviewed_resource_ids,
                    }
                    for r in approved_resources
                ],
            })

        overall_mastery = round(sum(assessed_scores) / float(len(assessed_scores)), 1) if assessed_scores else 0.0
        return {
            "subject": {
                "id": subj.id,
                "code": subj.code,
                "name": subj.name,
                "curriculum": subj.curriculum_label,
                "description": subj.description,
                "status": subj.status,
                "bookmarked": bookmarked,
                "overall_mastery": overall_mastery,
            },
            "chapters": chapters,
        }

    @staticmethod
    def get_topic_student_detail(student_id, topic_id):
        """Return detailed topic metadata, personal mastery breakdown, resources, and assessments."""
        topic = db.session.get(Topic, topic_id)
        if not topic:
            raise LookupError(f"Topic with ID {topic_id} not found.")

        m = MasteryService.get_latest_mastery(student_id, topic_id)
        reviewed_ids = {
            rv.resource_id for rv in ResourceView.query.filter_by(student_id=student_id).all()
        }
        prereqs = []
        for pr in Prerequisite.query.filter_by(topic_id=topic.id).all():
            req = db.session.get(Topic, pr.required_topic_id)
            if req:
                prereqs.append({"id": req.id, "title": req.title, "order_index": req.order_index})

        class_ids = StudentPortalService._get_student_enrolled_class_ids(student_id)
        assess_q = Assessment.query.filter_by(topic_id=topic_id, status="published")
        if class_ids:
            assess_q = assess_q.filter(Assessment.class_id.in_(class_ids))
        assessments = assess_q.order_by(Assessment.id.asc()).all()

        flags = (
            ErrorPatternFlag.query.filter_by(student_id=student_id, topic_id=topic_id)
            .filter(ErrorPatternFlag.status.in_(["suspected", "reviewed", "confirmed"]))
            .all()
        )

        next_steps = []
        if m["evidence_count"] == 0:
            next_steps.append(f"Review the concept notes and take the baseline check for {topic.title}.")
        elif m["mastery_score"] < 40:
            next_steps.append(f"Review foundational resources for {topic.title} before practicing easy drills.")
        elif m["mastery_score"] < 80:
            next_steps.append(f"Complete targeted practice sets on {topic.title} and attempt reassessment.")
        else:
            next_steps.append(f"Advance to challenge questions or the next unit after {topic.title}.")

        return {
            "topic": {
                "id": topic.id,
                "subject_id": topic.subject_id,
                "title": topic.title,
                "description": topic.description,
                "unit_name": topic.unit_name,
                "common_mistake_tip": topic.common_mistake_tip,
                "is_pilot": topic.is_pilot,
                "order_index": topic.order_index,
                "mastery_threshold": topic.mastery_threshold,
                "mastery": m["mastery_score"],
                "band": m["band"],
                "evidence_count": m["evidence_count"],
                "components": {
                    "accuracy": m["accuracy_component"],
                    "difficulty": m["difficulty_component"],
                    "recency": m["recency_component"],
                    "trend": m["trend_component"],
                },
                "skills": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "description": s.description,
                        "cognitive_domain": s.cognitive_domain,
                    }
                    for s in topic.skills
                ],
                "prerequisites": prereqs,
                "resources": [
                    {
                        "id": r.id,
                        "title": r.title,
                        "type": r.resource_type,
                        "url_or_path": r.url_or_path,
                        "description": r.description,
                        "difficulty": r.difficulty,
                        "reviewed": r.id in reviewed_ids,
                    }
                    for r in topic.resources
                    if r.approved
                ],
                "assessments": [
                    {
                        "id": a.id,
                        "title": a.title,
                        "assessment_type": a.assessment_type,
                        "category": a.category,
                        "estimated_minutes": a.estimated_minutes,
                        "allow_retakes": a.allow_retakes,
                    }
                    for a in assessments
                ],
                "active_error_patterns": [
                    {
                        "id": f.id,
                        "tag_name": f.error_tag.name if f.error_tag else None,
                        "match_count": f.match_count,
                        "status": f.status,
                    }
                    for f in flags
                ],
                "next_steps": next_steps,
            }
        }

    @staticmethod
    def mark_resource_reviewed(student_id, resource_id, duration_seconds=300):
        res = db.session.get(Resource, resource_id)
        if not res or not res.approved:
            raise LookupError(f"Approved resource with ID {resource_id} not found.")

        existing = ResourceView.query.filter_by(student_id=student_id, resource_id=resource_id).first()
        now = datetime.utcnow()
        duration_sec = max(0, int(duration_seconds or 0))

        if existing:
            existing.duration_seconds = max(existing.duration_seconds, duration_sec)
            existing.reviewed_at = now
        else:
            existing = ResourceView(
                student_id=student_id,
                resource_id=resource_id,
                duration_seconds=duration_sec,
                reviewed_at=now,
            )
            db.session.add(existing)

            mins = max(5, round(duration_sec / 60.0)) if duration_sec > 0 else 10
            topic = db.session.get(Topic, res.topic_id)
            StudentPortalService._upsert_daily_activity(
                student_id=student_id,
                activity_date=now.date(),
                tasks_delta=1,
                minutes_delta=mins,
                primary_topic_id=res.topic_id,
            )
            db.session.add(
                StudySession(
                    user_id=student_id,
                    subject_id=topic.subject_id if topic else None,
                    topic_id=res.topic_id,
                    activity_type="video" if res.resource_type == "video" else "resource",
                    title=res.title,
                    duration_minutes=mins,
                    platform="web",
                    time_slot=StudentPortalService._infer_time_slot(now.hour),
                    started_at=now - timedelta(minutes=mins),
                    ended_at=now,
                )
            )

        db.session.commit()
        return {
            "resource_id": resource_id,
            "reviewed": True,
            "reviewed_at": existing.reviewed_at.isoformat(),
        }

    @staticmethod
    def create_student_task(student_id, payload):
        title = (payload.get("title") or "").strip()
        if not title:
            raise ValueError("Task title cannot be blank.")
        task = StudentTask(student_id=student_id, title=title, is_done=bool(payload.get("is_done", False)))
        db.session.add(task)
        db.session.commit()
        return {
            "id": task.id,
            "title": task.title,
            "is_done": task.is_done,
            "created_at": task.created_at.isoformat(),
        }

    @staticmethod
    def toggle_student_task(student_id, task_id, is_done=None):
        task = db.session.get(StudentTask, task_id)
        if not task:
            raise LookupError(f"Task with ID {task_id} not found.")
        if task.student_id != student_id:
            raise PermissionError("You cannot modify another student's task.")

        new_done = (not task.is_done) if is_done is None else bool(is_done)
        task.is_done = new_done
        task.completed_at = datetime.utcnow() if new_done else None
        db.session.commit()
        return {
            "id": task.id,
            "title": task.title,
            "is_done": task.is_done,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        }

    @staticmethod
    def mark_reminder_read(student_id, reminder_id):
        rem = db.session.get(StudentReminder, reminder_id)
        if not rem:
            raise LookupError(f"Reminder with ID {reminder_id} not found.")
        if rem.recipient_user_id != student_id:
            raise PermissionError("You cannot modify another student's reminder.")
        rem.is_read = True
        db.session.commit()
        return {"id": rem.id, "is_read": True}

    @staticmethod
    def get_practice_hub(student_id, subject_id=None):
        """Return subject catalog and chapter-level assignments/quizzes/tests with personal progress."""
        class_ids = StudentPortalService._get_student_enrolled_class_ids(student_id)
        scored_attempts = Attempt.query.filter_by(student_id=student_id).all()

        attempts_by_assessment = {}
        for att in scored_attempts:
            attempts_by_assessment.setdefault(att.assessment_id, []).append(att)

        all_subjects = Subject.query.order_by(Subject.id.asc()).all()
        subj_cards = []
        default_subject = None

        for s in all_subjects:
            s_topics = Topic.query.filter_by(subject_id=s.id).all()
            s_assess_q = Assessment.query.filter_by(subject_id=s.id, status="published")
            if class_ids:
                s_assess_q = s_assess_q.filter(Assessment.class_id.in_(class_ids))
            s_assessments = s_assess_q.all()

            completed_a = sum(
                1
                for a in s_assessments
                if any(att.status in ("submitted", "scored") for att in attempts_by_assessment.get(a.id, []))
            )
            practiced_pct = (
                round((completed_a / float(len(s_assessments))) * 100.0, 1)
                if s_assessments
                else 0.0
            )
            subj_cards.append({
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "curriculum": s.curriculum_label or "CBSE Class 9",
                "category": s.category,
                "status": s.status,
                "badge": s.badge_label,
                "icon": s.icon,
                "description": s.description,
                "total_chapters": len(s_topics),
                "practiced_percentage": practiced_pct,
                "total_assignments": sum(1 for a in s_assessments if a.category == "assignment"),
                "total_quizzes": sum(1 for a in s_assessments if a.category == "practice_quiz"),
                "total_tests": sum(1 for a in s_assessments if a.category in ("diagnostic", "mock_test", "reassessment")),
            })
            if default_subject is None and len(s_topics) > 0 and (s.code == "MATH-9-UI" or s.status == "active"):
                default_subject = s

        active_subj = db.session.get(Subject, subject_id) if subject_id else default_subject
        if not active_subj and all_subjects:
            active_subj = all_subjects[0]
        if subject_id and not active_subj:
            raise LookupError(f"Subject with ID {subject_id} not found.")

        chapters = []
        if active_subj:
            topics = Topic.query.filter_by(subject_id=active_subj.id).order_by(Topic.order_index.asc()).all()
            for idx, t in enumerate(topics, start=1):
                m = MasteryService.get_latest_mastery(student_id, t.id)
                t_assess_q = Assessment.query.filter_by(topic_id=t.id, status="published")
                if class_ids:
                    t_assess_q = t_assess_q.filter(Assessment.class_id.in_(class_ids))
                t_assessments = t_assess_q.order_by(Assessment.id.asc()).all()

                assignments = []
                quizzes = []
                tests = []
                done_count = 0

                for a in t_assessments:
                    user_atts = [att for att in attempts_by_assessment.get(a.id, []) if att.status in ("submitted", "scored")]
                    in_prog = next((att for att in attempts_by_assessment.get(a.id, []) if att.status == "in_progress"), None)
                    best_score = max((att.percentage or 0.0) for att in user_atts) if user_atts else None
                    item_status = "completed" if user_atts else ("in_progress" if in_prog else "not_started")
                    if user_atts:
                        done_count += 1

                    item_payload = {
                        "id": a.id,
                        "assessment_id": a.id,
                        "title": a.title,
                        "category": a.category,
                        "assessment_type": a.assessment_type,
                        "exercise": a.exercise_label or a.assessment_type.title(),
                        "questions_count": len(a.questions),
                        "estimated_minutes": a.estimated_minutes,
                        "difficulty": a.difficulty_label,
                        "allow_retakes": a.allow_retakes,
                        "due_date": a.due_date.isoformat() if a.due_date else None,
                        "status": item_status,
                        "best_score": round(best_score, 1) if best_score is not None else None,
                        "attempts_count": len(user_atts),
                    }
                    if a.category == "assignment":
                        assignments.append(item_payload)
                    elif a.category == "practice_quiz":
                        quizzes.append(item_payload)
                    else:
                        tests.append(item_payload)

                chapters.append({
                    "id": t.id,
                    "chapter_number": idx,
                    "title": t.title,
                    "domain": t.unit_name or active_subj.curriculum_label,
                    "overview": t.description,
                    "mastery_score": m["mastery_score"],
                    "band": m["band"],
                    "assignments_count": len(assignments),
                    "quizzes_count": len(quizzes),
                    "tests_count": len(tests),
                    "completed_count": done_count,
                    "total_activities": len(t_assessments),
                    "recommendation_note": t.common_mistake_tip,
                    "assignments": assignments,
                    "quizzes": quizzes,
                    "tests": tests,
                })

        return {
            "subjects": subj_cards,
            "active_subject_id": active_subj.id if active_subj else None,
            "chapters": chapters,
        }

    @staticmethod
    def get_student_analysis(student_id, days=365):
        """Return 4-part explainable mastery breakdown, competency radar, error patterns, and heatmap."""
        mastery_data = AnalyticsService.get_student_mastery(student_id)
        growth_data = AnalyticsService.get_student_growth(student_id)
        assessed_topics = [t for t in mastery_data["topics"] if t["evidence_count"] > 0]

        def _avg(key, default=0.0):
            if not assessed_topics:
                return default
            return round(sum(t["components"][key] for t in assessed_topics) / float(len(assessed_topics)), 1)

        acc_avg = _avg("accuracy")
        diff_avg = _avg("difficulty")
        rec_avg = _avg("recency")
        trend_avg = _avg("trend", default=0.0)
        overall_m = (
            round(sum(t["mastery_score"] for t in assessed_topics) / float(len(assessed_topics)), 1)
            if assessed_topics
            else 0.0
        )

        # Competency domains computed from scored Answers joined to Skill.cognitive_domain
        domain_buckets = {
            "conceptual": [0, 0],
            "fluency": [0, 0],
            "problem_solving": [0, 0],
            "reasoning": [0, 0],
            "accuracy": [0, 0],
        }
        ans_rows = (
            db.session.query(Answer, Question, Skill)
            .join(Attempt, Answer.attempt_id == Attempt.id)
            .join(Question, Answer.question_id == Question.id)
            .outerjoin(Skill, Question.skill_id == Skill.id)
            .filter(Attempt.student_id == student_id, Attempt.status.in_(["submitted", "scored"]))
            .all()
        )
        for ans, _q, sk in ans_rows:
            domain_buckets["accuracy"][1] += 1
            if ans.is_correct:
                domain_buckets["accuracy"][0] += 1
            dom = sk.cognitive_domain if (sk and sk.cognitive_domain in domain_buckets) else "conceptual"
            domain_buckets[dom][1] += 1
            if ans.is_correct:
                domain_buckets[dom][0] += 1

        domain_labels = {
            "conceptual": "Conceptual",
            "fluency": "Fluency",
            "problem_solving": "Problem Solving",
            "reasoning": "Reasoning",
            "accuracy": "Accuracy",
        }
        competency_domains = []
        for dom_key, label in domain_labels.items():
            ok, tot = domain_buckets[dom_key]
            competency_domains.append({
                "key": dom_key,
                "domain": label,
                "score": round((ok / float(tot)) * 100.0, 1) if tot > 0 else 0.0,
                "full_mark": 100,
                "evidence_count": tot,
            })

        flags = ErrorPatternFlag.query.filter_by(student_id=student_id).order_by(
            ErrorPatternFlag.calculated_at.desc()
        ).all()
        error_patterns = [
            {
                "id": f.id,
                "topic_id": f.topic_id,
                "topic": f.topic.title if f.topic else None,
                "title": f.error_tag.name if f.error_tag else "error_pattern",
                "description": f.error_tag.description if f.error_tag else None,
                "match_count": f.match_count,
                "incorrect_count": f.incorrect_count,
                "evidence_count": f.evidence_count,
                "status": f.status,
                "teacher_note": f.reviews[-1].note if f.reviews else None,
            }
            for f in flags
        ]

        return {
            "student_id": student_id,
            "overall_mastery": overall_m,
            "overall_band": MasteryService.get_mastery_band(overall_m),
            "mastery_formula_breakdown": [
                {"key": "accuracy", "name": "Recent & Historical Accuracy", "weight": 0.40, "score": acc_avg},
                {"key": "difficulty", "name": "Question Difficulty", "weight": 0.20, "score": diff_avg},
                {"key": "recency", "name": "Practice Recency", "weight": 0.20, "score": rec_avg},
                {"key": "trend", "name": "Performance Trend", "weight": 0.20, "score": trend_avg},
            ],
            "topics": mastery_data["topics"],
            "trajectory": growth_data["growth_timeline"],
            "competency_domains": competency_domains,
            "error_patterns": error_patterns,
            "activity_heatmap": StudentPortalService._build_activity_heatmap(student_id, days=days),
        }

    @staticmethod
    def get_weekly_progress(student_id, week_offset=0, week_key=None):
        """Aggregate 8 rolling weeks of real study sessions, daily activity, and cohort rank."""
        today_date = datetime.utcnow().date()
        current_monday = today_date - timedelta(days=today_date.weekday())

        class_ids = StudentPortalService._get_student_enrolled_class_ids(student_id)
        peer_ids = (
            [
                e.student_id
                for e in Enrollment.query.filter(
                    Enrollment.class_id.in_(class_ids), Enrollment.status == "active"
                ).all()
            ]
            if class_ids
            else [student_id]
        )

        # Build week-1 (oldest, 7 weeks ago) through week-8 (current week)
        weeks_list = []
        for idx in range(8):
            weeks_ago = 7 - idx
            wk_num = idx + 1
            wk_start = current_monday - timedelta(weeks=weeks_ago)
            wk_end = wk_start + timedelta(days=6)
            wk_start_dt = datetime.combine(wk_start, datetime.min.time())
            wk_end_dt = datetime.combine(wk_end, datetime.max.time())

            daily_rows = (
                StudentDailyActivity.query.filter_by(student_id=student_id)
                .filter(
                    StudentDailyActivity.activity_date >= wk_start,
                    StudentDailyActivity.activity_date <= wk_end,
                )
                .all()
            )
            sess_rows = (
                StudySession.query.filter_by(user_id=student_id)
                .filter(StudySession.started_at >= wk_start_dt, StudySession.started_at <= wk_end_dt)
                .order_by(StudySession.started_at.desc())
                .all()
            )

            tasks_completed = sum(int(r.tasks_completed or 0) for r in daily_rows)
            if tasks_completed == 0 and sess_rows:
                tasks_completed = len(sess_rows)

            active_mins_daily = sum(int(r.active_minutes or 0) for r in daily_rows)
            active_mins_sess = sum(int(s.duration_minutes or 0) for s in sess_rows)
            total_mins = max(active_mins_daily, active_mins_sess)
            total_hours = round(total_mins / 60.0, 1)

            mobile_mins = sum(int(s.duration_minutes or 0) for s in sess_rows if s.platform == "mobile")
            web_mins = sum(int(s.duration_minutes or 0) for s in sess_rows if s.platform == "web")
            if web_mins == 0 and total_mins > mobile_mins:
                web_mins = total_mins - mobile_mins

            active_topic_ids = {r.primary_topic_id for r in daily_rows if r.primary_topic_id} | {
                s.topic_id for s in sess_rows if s.topic_id
            }

            scored_sess = [float(s.score_percentage) for s in sess_rows if s.score_percentage is not None]
            perf_score = round(sum(scored_sess) / float(len(scored_sess)), 1) if scored_sess else 0.0

            weeks_list.append({
                "key": f"week-{wk_num}",
                "week_num": wk_num,
                "label": f"Week {wk_num}",
                "date_range": f"{wk_start.strftime('%b %d')} - {wk_end.strftime('%b %d')}",
                "start_date": wk_start.isoformat(),
                "end_date": wk_end.isoformat(),
                "tasks_completed": tasks_completed,
                "active_topics": len(active_topic_ids),
                "total_minutes": total_mins,
                "total_hours": total_hours,
                "channel_mobile_hours": round(mobile_mins / 60.0, 1),
                "channel_web_hours": round(web_mins / 60.0, 1),
                "performance_score": perf_score,
                "sessions_count": len(sess_rows),
            })

        # Select requested week (default week-8 / offset 0)
        selected_idx = 7 - max(0, min(7, int(week_offset or 0)))
        if week_key:
            for i, w in enumerate(weeks_list):
                if w["key"] == week_key:
                    selected_idx = i
                    break

        selected = dict(weeks_list[selected_idx])
        sel_start = date.fromisoformat(selected["start_date"])
        sel_end = date.fromisoformat(selected["end_date"])
        sel_start_dt = datetime.combine(sel_start, datetime.min.time())
        sel_end_dt = datetime.combine(sel_end, datetime.max.time())

        # Compute peer ranking in active class for the selected week (None if student has 0 activity)
        rank = None
        rank_percentile = None
        total_peers = len(set(peer_ids))
        if selected["total_minutes"] > 0 or selected["tasks_completed"] > 0:
            peer_scores = []
            for pid in set(peer_ids):
                p_mins = sum(
                    int(r.active_minutes or 0)
                    for r in StudentDailyActivity.query.filter_by(student_id=pid)
                    .filter(
                        StudentDailyActivity.activity_date >= sel_start,
                        StudentDailyActivity.activity_date <= sel_end,
                    )
                    .all()
                )
                peer_scores.append((pid, p_mins))
            peer_scores.sort(key=lambda x: (-x[1], x[0]))
            for pos, (pid, _mins) in enumerate(peer_scores, start=1):
                if pid == student_id:
                    rank = pos
                    break
            if rank is not None and total_peers > 0:
                rank_percentile = max(1, round((rank / float(total_peers)) * 100))

        # Schedule matrix for selected week (morning/afternoon/evening x Mon..Sun)
        sel_sessions = (
            StudySession.query.filter_by(user_id=student_id)
            .filter(StudySession.started_at >= sel_start_dt, StudySession.started_at <= sel_end_dt)
            .order_by(StudySession.started_at.desc())
            .all()
        )
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        slot_defs = [
            ("morning", "06:00 - 12:00"),
            ("afternoon", "12:00 - 17:00"),
            ("evening", "17:00 - 22:00"),
        ]
        schedule_matrix = []
        for slot_key, slot_label in slot_defs:
            days_cells = []
            for d_idx, d_name in enumerate(day_names):
                cell_day = sel_start + timedelta(days=d_idx)
                matching = [
                    s
                    for s in sel_sessions
                    if s.started_at.date() == cell_day and s.time_slot == slot_key
                ]
                mins = sum(int(s.duration_minutes or 0) for s in matching)
                st = "active" if mins >= 30 else ("light" if mins > 0 else "inactive")
                days_cells.append({
                    "day": d_name,
                    "date": cell_day.isoformat(),
                    "status": st,
                    "mins": mins,
                    "task": matching[0].title if matching else None,
                    "score": matching[0].score_percentage if matching else None,
                })
            schedule_matrix.append({"time_slot": slot_key, "label": slot_label, "days": days_cells})

        all_dates = [
            r.activity_date
            for r in StudentDailyActivity.query.filter_by(student_id=student_id).all()
            if (r.questions_answered or 0) > 0
        ]
        cur_streak, longest_streak = StudentPortalService._calculate_streaks(all_dates, today_date)

        # Mastered topics count up to now
        topics = Topic.query.all()
        mastered_count = 0
        for t in topics:
            m = MasteryService.get_latest_mastery(student_id, t.id)
            if m["evidence_count"] > 0 and m["mastery_score"] >= t.mastery_threshold:
                mastered_count += 1

        selected.update({
            "mastered_count": mastered_count,
            "total_topics": len(topics),
            "rank": rank,
            "total_peers": total_peers,
            "rank_percentile": rank_percentile,
            "current_streak": cur_streak,
            "longest_streak": longest_streak,
            "tasks_history": [w["tasks_completed"] for w in weeks_list],
        })

        return {
            "student_id": student_id,
            "selected_week": selected,
            "weeks": weeks_list,
            "schedule_matrix": schedule_matrix,
            "sessions": [
                {
                    "id": s.id,
                    "activity_type": s.activity_type,
                    "title": s.title,
                    "topic": s.topic.title if s.topic else None,
                    "subject": s.subject.name if s.subject else None,
                    "duration_minutes": s.duration_minutes,
                    "score_percentage": s.score_percentage,
                    "platform": s.platform,
                    "time_slot": s.time_slot,
                    "started_at": s.started_at.isoformat(),
                }
                for s in sel_sessions
            ],
        }

    @staticmethod
    def create_study_session(student_id, payload):
        """Log a standalone student study session and update daily activity heatmap."""
        title = (payload.get("title") or "").strip()
        if not title:
            raise ValueError("Study session title is required.")

        act_type = (payload.get("activity_type") or "practice").strip().lower()
        if act_type not in ("quiz", "practice", "assignment", "resource", "video"):
            raise ValueError("Invalid activity_type.")

        platform = (payload.get("platform") or "web").strip().lower()
        if platform not in ("web", "mobile"):
            raise ValueError("platform must be 'web' or 'mobile'.")

        duration_mins = max(1, int(payload.get("duration_minutes") or 15))
        now = datetime.utcnow()
        slot = (payload.get("time_slot") or StudentPortalService._infer_time_slot(now.hour)).strip().lower()
        if slot not in ("morning", "afternoon", "evening"):
            raise ValueError("time_slot must be 'morning', 'afternoon', or 'evening'.")

        session = StudySession(
            user_id=student_id,
            subject_id=payload.get("subject_id"),
            topic_id=payload.get("topic_id"),
            assessment_id=payload.get("assessment_id"),
            activity_type=act_type,
            title=title,
            duration_minutes=duration_mins,
            score_percentage=payload.get("score_percentage"),
            platform=platform,
            time_slot=slot,
            started_at=now - timedelta(minutes=duration_mins),
            ended_at=now,
        )
        db.session.add(session)
        StudentPortalService._upsert_daily_activity(
            student_id=student_id,
            activity_date=now.date(),
            tasks_delta=1,
            minutes_delta=duration_mins,
            primary_topic_id=payload.get("topic_id"),
        )
        db.session.commit()
        return {
            "id": session.id,
            "title": session.title,
            "activity_type": session.activity_type,
            "duration_minutes": session.duration_minutes,
            "platform": session.platform,
            "time_slot": session.time_slot,
            "started_at": session.started_at.isoformat(),
        }

    @staticmethod
    def get_student_report_card_bundle(student_id):
        """Return comprehensive student report card bundle (terms, attendance, rank, feedback, achievements)."""
        student = db.session.get(User, student_id)
        if not student:
            raise LookupError("Student not found.")

        enrollment = Enrollment.query.filter_by(student_id=student_id, status="active").first()
        classroom = enrollment.classroom if enrollment else None

        # Attendance summary strictly for student_id
        att_rows = AttendanceRecord.query.filter_by(student_id=student_id).all()
        total_att = len(att_rows)
        present_att = sum(1 for a in att_rows if a.status in ("present", "late"))
        att_pct = round((present_att / float(total_att)) * 100.0, 1) if total_att > 0 else 0.0

        # Overall mastery from student's own assessed topics
        topics = Topic.query.all()
        assessed_scores = []
        for t in topics:
            m = MasteryService.get_latest_mastery(student_id, t.id)
            if m["evidence_count"] > 0:
                assessed_scores.append(m["mastery_score"])
        overall_mastery = round(sum(assessed_scores) / float(len(assessed_scores)), 1) if assessed_scores else 0.0

        # Class rank only computed if student has evidence
        rank = None
        rank_cohort = 0
        if classroom:
            peer_ids = [
                e.student_id for e in Enrollment.query.filter_by(class_id=classroom.id, status="active").all()
            ]
            rank_cohort = len(set(peer_ids))
            if assessed_scores:
                peer_avgs = []
                for pid in set(peer_ids):
                    p_scores = [
                        MasteryService.get_latest_mastery(pid, t.id)["mastery_score"]
                        for t in topics
                        if MasteryService.get_latest_mastery(pid, t.id)["evidence_count"] > 0
                    ]
                    p_avg = round(sum(p_scores) / float(len(p_scores)), 1) if p_scores else 0.0
                    peer_avgs.append((pid, p_avg))
                peer_avgs.sort(key=lambda x: (-x[1], x[0]))
                for idx, (pid, _val) in enumerate(peer_avgs, start=1):
                    if pid == student_id:
                        rank = idx
                        break

        reports = (
            Report.query.filter_by(student_id=student_id)
            .order_by(Report.generated_at.desc())
            .all()
        )
        reports_by_term = {}
        for rep in reports:
            term = rep.term_label
            if term not in reports_by_term:
                rep_subj = db.session.get(Subject, rep.subject_id) if rep.subject_id else None
                reports_by_term[term] = {
                    "id": rep.id,
                    "term_label": rep.term_label,
                    "subject_name": rep_subj.name if rep_subj else None,
                    "generated_at": rep.generated_at.isoformat(),
                    "payload": rep.payload_json,
                }

        feedback_rows = (
            TeacherFeedback.query.filter_by(student_id=student_id, is_visible_to_student=True)
            .order_by(TeacherFeedback.created_at.desc())
            .all()
        )
        feedback = [
            {
                "id": fb.id,
                "teacher_name": fb.teacher.name if fb.teacher else "Faculty",
                "subject": fb.subject.name if fb.subject else "General",
                "comment": fb.comment_text,
                "tags": fb.tags_json or [],
                "date": fb.created_at.strftime("%b %d, %Y"),
                "created_at": fb.created_at.isoformat(),
            }
            for fb in feedback_rows
        ]

        ach_rows = (
            StudentAchievement.query.filter_by(student_id=student_id)
            .order_by(StudentAchievement.awarded_at.desc())
            .all()
        )
        achievements = [
            {
                "id": sa.id,
                "code": sa.achievement.code if sa.achievement else None,
                "title": sa.achievement.title if sa.achievement else None,
                "description": sa.achievement.description if sa.achievement else None,
                "category": sa.achievement.category if sa.achievement else None,
                "badge": sa.achievement.badge_label if sa.achievement else None,
                "color": sa.achievement.color_theme if sa.achievement else None,
                "icon_type": sa.achievement.icon_type if sa.achievement else None,
                "awarded_at": sa.awarded_at.isoformat(),
            }
            for sa in ach_rows
        ]

        gains = LearningGainRecord.query.filter_by(student_id=student_id).order_by(
            LearningGainRecord.calculated_at.desc()
        ).all()

        scored_attempts = Attempt.query.filter_by(student_id=student_id).filter(
            Attempt.status.in_(["submitted", "scored"])
        ).all()
        overall_acc = (
            round(sum(a.percentage or 0.0 for a in scored_attempts) / float(len(scored_attempts)), 1)
            if scored_attempts
            else 0.0
        )

        return {
            "student_profile": {
                "student_id": student.id,
                "public_id": student.public_id,
                "name": student.name,
                "email": student.email,
                "class_name": classroom.name if classroom else "Unassigned",
                "grade": classroom.grade if classroom else None,
                "section": classroom.section if classroom else None,
                "academic_year": classroom.academic_year if classroom else None,
            },
            "attendance": {
                "present": present_att,
                "total": total_att,
                "percentage": att_pct,
            },
            "overall_score": overall_acc,
            "overall_mastery": overall_mastery,
            "overall_band": ReportService._get_band_label(overall_mastery),
            "rank": rank,
            "rank_cohort": rank_cohort,
            "reports_by_term": reports_by_term,
            "learning_gains": [
                {
                    "id": g.id,
                    "topic_id": g.topic_id,
                    "pre_score": g.pre_score,
                    "post_score": g.post_score,
                    "score_gain": g.score_gain,
                    "before_mastery": g.before_mastery,
                    "after_mastery": g.after_mastery,
                    "mastery_gain": g.mastery_gain,
                    "calculated_at": g.calculated_at.isoformat(),
                }
                for g in gains
            ],
            "feedback": feedback,
            "achievements": achievements,
        }
