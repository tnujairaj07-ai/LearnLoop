"""Teacher portal service powering cockpit dashboard, real-time monitoring,
homeroom management, topic analytics, student profiles, notes, reminders, and attendance.
"""

from datetime import date, datetime, timedelta

from app.extensions import db
from app.models.academic import ResourceView, Subject, Topic
from app.models.assessment import Answer, Attempt
from app.models.content import Question
from app.models.engagement import (
    AttendanceRecord,
    ClassAnnouncement,
    StudentDailyActivity,
    StudentReminder,
    StudentTask,
    StudySession,
    TeacherFeedback,
)
from app.models.governance import LearningGainRecord
from app.models.intervention import Intervention, InterventionStudent
from app.models.mastery import ErrorPatternFlag
from app.models.user import Class, Enrollment, TeacherAssignment, User
from app.services.analytics_service import AnalyticsService
from app.services.audit_service import AuditService
from app.services.mastery_service import MasteryService
from app.services.student_portal_service import StudentPortalService


class TeacherPortalService:
    """Service layer for teacher-facing operational and analytics endpoints."""

    @staticmethod
    def _verify_class_or_homeroom_access(actor_id, actor_role, class_id):
        classroom = db.session.get(Class, class_id)
        if not classroom:
            raise ValueError(f"Class with ID {class_id} not found.")
        if actor_role == "admin":
            return classroom

        is_assigned = (
            TeacherAssignment.query.filter_by(
                teacher_id=actor_id, class_id=class_id, is_active=True
            ).first()
            is not None
        )
        is_homeroom = classroom.homeroom_teacher_id == actor_id
        if not (is_assigned or is_homeroom):
            raise PermissionError("Access denied: You are not assigned to teach this class.")
        return classroom

    @staticmethod
    def _verify_student_teaching_access(actor_id, actor_role, student_id):
        student = db.session.get(User, student_id)
        if not student or not student.role or student.role.name != "student":
            raise LookupError(f"Student with ID {student_id} not found.")

        enrollments = Enrollment.query.filter_by(student_id=student_id, status="active").all()
        if actor_role == "admin":
            return student, (enrollments[0] if enrollments else None)

        teacher_class_ids = {
            ta.class_id
            for ta in TeacherAssignment.query.filter_by(teacher_id=actor_id, is_active=True).all()
        }
        homeroom_class_ids = {
            c.id for c in Class.query.filter_by(homeroom_teacher_id=actor_id).all()
        }
        allowed_class_ids = teacher_class_ids | homeroom_class_ids

        matching_enrollment = next(
            (e for e in enrollments if e.class_id in allowed_class_ids), None
        )
        if not matching_enrollment:
            raise PermissionError(
                "Access denied: Student is not enrolled in any of your assigned classes."
            )
        return student, matching_enrollment

    @staticmethod
    def _resolve_default_class_id(teacher_id):
        ta = (
            TeacherAssignment.query.filter_by(teacher_id=teacher_id, is_active=True)
            .order_by(TeacherAssignment.class_id.asc())
            .first()
        )
        if ta:
            return ta.class_id
        hr = Class.query.filter_by(homeroom_teacher_id=teacher_id).order_by(Class.id.asc()).first()
        return hr.id if hr else None

    @staticmethod
    def get_teacher_dashboard(actor_id, actor_role="teacher", class_id=None):
        """Return weekly class engagement curve, live hourly activity, top gainers, consistency, and alerts."""
        resolved_class_id = class_id or TeacherPortalService._resolve_default_class_id(actor_id)
        if resolved_class_id is None:
            return {
                "has_class": False,
                "class_id": None,
                "class_overview": None,
                "weekly_engagement": [],
                "live_hourly_activity": [],
                "top_gainers": [],
                "most_consistent": [],
                "needs_attention": [],
                "pending_interventions": [],
            }

        classroom = TeacherPortalService._verify_class_or_homeroom_access(
            actor_id, actor_role, resolved_class_id
        )
        enrollments = Enrollment.query.filter_by(class_id=resolved_class_id, status="active").all()
        students_by_id = {e.student_id: e.student for e in enrollments if e.student is not None}
        student_ids = list(students_by_id.keys())

        # Core class overview (safely works for homeroom-only or admin too)
        try:
            class_overview = AnalyticsService.get_class_dashboard(actor_id, resolved_class_id)
        except PermissionError:
            class_overview = {
                "class_id": classroom.id,
                "class_name": classroom.name,
                "grade": classroom.grade,
                "section": classroom.section,
                "total_enrolled": len(student_ids),
                "overall_class_mastery": 0.0,
                "mastery_band_distribution": {},
                "total_assessments": 0,
                "total_attempts_completed": 0,
                "active_interventions_count": 0,
                "active_error_flags_count": 0,
            }

        # Weekly engagement series (7 rolling days this week vs previous week)
        today_date = datetime.utcnow().date()
        week_start = today_date - timedelta(days=today_date.weekday())
        day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        weekly_engagement = []
        for idx, day_lbl in enumerate(day_labels):
            d_cur = week_start + timedelta(days=idx)
            d_prev = d_cur - timedelta(days=7)
            this_mins = 0
            last_mins = 0
            if student_ids:
                this_rows = StudentDailyActivity.query.filter(
                    StudentDailyActivity.student_id.in_(student_ids),
                    StudentDailyActivity.activity_date == d_cur,
                ).all()
                last_rows = StudentDailyActivity.query.filter(
                    StudentDailyActivity.student_id.in_(student_ids),
                    StudentDailyActivity.activity_date == d_prev,
                ).all()
                this_mins = sum(int(r.active_minutes or 0) for r in this_rows)
                last_mins = sum(int(r.active_minutes or 0) for r in last_rows)
            weekly_engagement.append({
                "day": day_lbl,
                "date": d_cur.isoformat(),
                "this_week": this_mins,
                "last_week": last_mins,
            })

        # Today's hourly StudySession distribution
        today_start = datetime.combine(today_date, datetime.min.time())
        hourly_counts = {h: 0 for h in range(8, 22)}
        if student_ids:
            today_sessions = StudySession.query.filter(
                StudySession.user_id.in_(student_ids),
                StudySession.started_at >= today_start,
            ).all()
            for sess in today_sessions:
                hr = sess.started_at.hour
                bucket_hr = min(21, max(8, hr))
                hourly_counts[bucket_hr] = hourly_counts.get(bucket_hr, 0) + 1
        live_hourly_activity = [
            {"hour": f"{h:02d}:00", "sessions": count}
            for h, count in sorted(hourly_counts.items())
        ]

        # Top gainers from LearningGainRecord
        top_gainers = []
        if student_ids:
            gain_rows = (
                LearningGainRecord.query.filter(LearningGainRecord.student_id.in_(student_ids))
                .order_by(LearningGainRecord.mastery_gain.desc())
                .limit(5)
                .all()
            )
            for gr in gain_rows:
                stu = students_by_id.get(gr.student_id)
                gr_topic = db.session.get(Topic, gr.topic_id) if gr.topic_id else None
                top_gainers.append({
                    "student_id": gr.student_id,
                    "name": stu.name if stu else f"Student {gr.student_id}",
                    "roll_no": stu.public_id if stu else None,
                    "gain": round(float(gr.mastery_gain or 0.0), 1),
                    "score_gain": round(float(gr.score_gain or 0.0), 1),
                    "topic": gr_topic.title if gr_topic else None,
                    "band": MasteryService.get_mastery_band(float(gr.after_mastery or 0.0)),
                })

        # Most consistent learners via StudentDailyActivity streak
        consistency_list = []
        for sid, stu in students_by_id.items():
            act_rows = StudentDailyActivity.query.filter_by(student_id=sid).all()
            dates = [r.activity_date for r in act_rows if (r.questions_answered or 0) > 0]
            if not dates:
                continue
            cur_streak, _ = StudentPortalService._calculate_streaks(dates, today_date)
            total_mins = sum(int(r.active_minutes or 0) for r in act_rows)
            consistency_list.append({
                "student_id": sid,
                "name": stu.name,
                "roll_no": stu.public_id,
                "streak": cur_streak,
                "active_days": len(dates),
                "total_minutes": total_mins,
            })
        consistency_list.sort(key=lambda x: (-x["streak"], -x["active_days"], -x["total_minutes"]))

        # Needs attention via latest topic mastery & active flags
        topics = Topic.query.all()
        needs_attention = []
        for sid, stu in students_by_id.items():
            scores = []
            for t in topics:
                m = MasteryService.get_latest_mastery(sid, t.id)
                if m["evidence_count"] > 0:
                    scores.append((t.title, m["mastery_score"]))
            avg_m = round(sum(s for _, s in scores) / float(len(scores)), 1) if scores else None
            flags_count = (
                ErrorPatternFlag.query.filter_by(student_id=sid)
                .filter(ErrorPatternFlag.status.in_(["suspected", "reviewed"]))
                .count()
            )
            if (avg_m is not None and avg_m < 60.0) or flags_count > 0:
                weakest_topic = min(scores, key=lambda x: x[1])[0] if scores else "Core Mathematics"
                needs_attention.append({
                    "student_id": sid,
                    "name": stu.name,
                    "roll_no": stu.public_id,
                    "mastery": avg_m if avg_m is not None else 0.0,
                    "active_flags": flags_count,
                    "issue": weakest_topic,
                    "status": "Needs teacher support" if (avg_m or 0.0) < 40.0 else "Developing",
                })
        needs_attention.sort(key=lambda x: (x["mastery"], -x["active_flags"]))

        interventions = (
            Intervention.query.filter_by(class_id=resolved_class_id)
            .filter(Intervention.status.in_(["suggested", "reviewed", "assigned", "in_progress"]))
            .order_by(Intervention.created_at.desc())
            .limit(6)
            .all()
        )
        pending_interventions = []
        for inv in interventions:
            inv_topic = db.session.get(Topic, inv.topic_id) if inv.topic_id else None
            pending_interventions.append({
                "id": inv.id,
                "title": inv.title,
                "topic_id": inv.topic_id,
                "topic_name": inv_topic.title if inv_topic else None,
                "status": inv.status,
                "reason": inv.reason,
                "affected_count": len(inv.students),
                "recommended_action": inv.recommended_action,
                "created_at": inv.created_at.isoformat(),
            })

        return {
            "has_class": True,
            "class_id": resolved_class_id,
            "class_overview": class_overview,
            "weekly_engagement": weekly_engagement,
            "live_hourly_activity": live_hourly_activity,
            "top_gainers": top_gainers,
            "most_consistent": consistency_list[:5],
            "needs_attention": needs_attention[:8],
            "pending_interventions": pending_interventions,
        }

    @staticmethod
    def get_realtime_activity(actor_id, actor_role="teacher", class_id=None, target_date_str=None, day_offset=0):
        """Return live student attendance, active minutes, lectures attended, and latest quiz scores."""
        resolved_class_id = class_id or TeacherPortalService._resolve_default_class_id(actor_id)
        if target_date_str:
            target_date = date.fromisoformat(target_date_str)
        else:
            target_date = datetime.utcnow().date() - timedelta(days=max(0, int(day_offset or 0)))

        if resolved_class_id is None:
            return {
                "class_id": None,
                "date": target_date.isoformat(),
                "summary": {
                    "total": 0,
                    "attended": 0,
                    "not_visited": 0,
                    "total_minutes": 0,
                    "avg_minutes": 0.0,
                    "attendance_rate": 0.0,
                },
                "students": [],
            }

        classroom = TeacherPortalService._verify_class_or_homeroom_access(
            actor_id, actor_role, resolved_class_id
        )
        enrollments = Enrollment.query.filter_by(class_id=resolved_class_id, status="active").all()
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = datetime.combine(target_date, datetime.max.time())

        student_rows = []
        attended_count = 0
        total_mins_all = 0

        for e in enrollments:
            stu = e.student
            if not stu:
                continue

            att_rec = AttendanceRecord.query.filter_by(
                student_id=stu.id, class_id=resolved_class_id, attendance_date=target_date
            ).first()
            sessions = (
                StudySession.query.filter_by(user_id=stu.id)
                .filter(StudySession.started_at >= day_start, StudySession.started_at <= day_end)
                .order_by(StudySession.started_at.desc())
                .all()
            )
            daily_rec = StudentDailyActivity.query.filter_by(
                student_id=stu.id, activity_date=target_date
            ).first()
            latest_attempt = (
                Attempt.query.filter_by(student_id=stu.id)
                .filter(Attempt.status.in_(["submitted", "scored"]))
                .order_by(Attempt.submitted_at.desc())
                .first()
            )

            active_mins = sum(int(s.duration_minutes or 0) for s in sessions)
            if active_mins == 0 and daily_rec:
                active_mins = int(daily_rec.active_minutes or 0)

            visited = (
                (att_rec and att_rec.status in ("present", "late"))
                or len(sessions) > 0
                or (daily_rec is not None and (daily_rec.active_minutes or 0) > 0)
            )
            if att_rec and att_rec.status == "absent" and len(sessions) == 0:
                visited = False

            status_label = "attended" if visited else "not_visited"
            if visited:
                attended_count += 1
            total_mins_all += active_mins

            quiz_score = None
            if sessions and sessions[0].score_percentage is not None:
                quiz_score = round(float(sessions[0].score_percentage), 1)
            elif latest_attempt and latest_attempt.percentage is not None:
                quiz_score = round(float(latest_attempt.percentage), 1)

            lectures_attended = [
                {"type": s.activity_type, "title": s.title, "minutes": s.duration_minutes}
                for s in sessions
            ]

            student_rows.append({
                "id": stu.id,
                "name": stu.name,
                "roll_no": stu.public_id,
                "class_id": classroom.id,
                "class_name": classroom.name,
                "status": status_label,
                "last_active_time": sessions[0].started_at.strftime("%I:%M %p") if sessions else None,
                "active_minutes": active_mins,
                "lectures_attended": lectures_attended,
                "current_stage": sessions[0].title if sessions else None,
                "quiz_score": quiz_score,
                "accuracy_status": (
                    "Secure" if (quiz_score or 0) >= 80 else ("Developing" if (quiz_score or 0) >= 50 else "Needs support")
                ) if quiz_score is not None else "Unassessed",
            })

        total = len(student_rows)
        return {
            "class_id": classroom.id,
            "class_name": classroom.name,
            "date": target_date.isoformat(),
            "summary": {
                "total": total,
                "attended": attended_count,
                "not_visited": total - attended_count,
                "total_minutes": total_mins_all,
                "avg_minutes": round(total_mins_all / float(total), 1) if total > 0 else 0.0,
                "attendance_rate": round((attended_count / float(total)) * 100.0, 1) if total > 0 else 0.0,
            },
            "students": student_rows,
        }

    @staticmethod
    def send_student_reminder(actor_id, actor_role, student_id, payload):
        """Send an actionable study reminder / nudge to a student."""
        student, enrollment = TeacherPortalService._verify_student_teaching_access(
            actor_id, actor_role, student_id
        )
        message = (payload.get("message") or "").strip()
        if not message:
            raise ValueError("Reminder message cannot be blank.")

        title = (payload.get("title") or "Study Reminder from Teacher").strip()
        reminder_type = (payload.get("reminder_type") or "nudge").strip().lower()
        if reminder_type not in ("nudge", "reassessment", "intervention", "announcement"):
            raise ValueError("Invalid reminder_type.")

        reminder = StudentReminder(
            recipient_user_id=student.id,
            sender_user_id=actor_id,
            class_id=enrollment.class_id if enrollment else None,
            title=title,
            message=message,
            reminder_type=reminder_type,
            is_read=False,
        )
        db.session.add(reminder)
        db.session.commit()

        AuditService.log_event(
            action="teacher.send_reminder",
            entity_type="StudentReminder",
            entity_id=reminder.id,
            actor_id=actor_id,
            metadata_json={"student_id": student.id, "reminder_type": reminder_type},
            commit=True,
        )
        return {
            "id": reminder.id,
            "recipient_user_id": reminder.recipient_user_id,
            "title": reminder.title,
            "message": reminder.message,
            "reminder_type": reminder.reminder_type,
            "created_at": reminder.created_at.isoformat(),
        }

    @staticmethod
    def get_my_class(teacher_id):
        """Return teacher's homeroom class, active announcement, and multi-subject student roster."""
        homeroom_class = Class.query.filter_by(homeroom_teacher_id=teacher_id).order_by(Class.id.asc()).first()
        target_class = homeroom_class
        is_homeroom = homeroom_class is not None

        if not target_class:
            ta = (
                TeacherAssignment.query.filter_by(teacher_id=teacher_id, is_active=True)
                .order_by(TeacherAssignment.class_id.asc())
                .first()
            )
            if ta and ta.classroom:
                target_class = ta.classroom

        if not target_class:
            return {
                "is_homeroom": False,
                "homeroom_class": None,
                "announcement": None,
                "students": [],
            }

        ann = (
            ClassAnnouncement.query.filter_by(class_id=target_class.id, is_active=True)
            .order_by(ClassAnnouncement.updated_at.desc())
            .first()
        )
        today_date = datetime.utcnow().date()
        enrollments = Enrollment.query.filter_by(class_id=target_class.id, status="active").all()
        subjects = Subject.query.filter_by(status="active").all()
        subject_topics = {
            s.id: Topic.query.filter_by(subject_id=s.id).all() for s in subjects
        }

        students_data = []
        for e in enrollments:
            stu = e.student
            if not stu:
                continue

            att_today = AttendanceRecord.query.filter_by(
                student_id=stu.id, class_id=target_class.id, attendance_date=today_date
            ).first()
            has_session_today = (
                StudySession.query.filter_by(user_id=stu.id)
                .filter(StudySession.started_at >= datetime.combine(today_date, datetime.min.time()))
                .count()
                > 0
            )
            attendance_status = (
                "attended"
                if (att_today and att_today.status in ("present", "late")) or has_session_today
                else "not_visited"
            )

            subject_masteries = {}
            all_scores = []
            for subj in subjects:
                s_scores = []
                for t in subject_topics.get(subj.id, []):
                    m = MasteryService.get_latest_mastery(stu.id, t.id)
                    if m["evidence_count"] > 0:
                        s_scores.append(m["mastery_score"])
                        all_scores.append(m["mastery_score"])
                if s_scores:
                    subject_masteries[subj.name] = round(sum(s_scores) / float(len(s_scores)), 1)

            overall_avg = round(sum(all_scores) / float(len(all_scores)), 1) if all_scores else 0.0
            latest_gain = (
                LearningGainRecord.query.filter_by(student_id=stu.id)
                .order_by(LearningGainRecord.calculated_at.desc())
                .first()
            )

            students_data.append({
                "id": stu.id,
                "public_id": stu.public_id,
                "name": stu.name,
                "email": stu.email,
                "attendance": attendance_status,
                "overall_mastery": overall_avg,
                "subject_masteries": subject_masteries,
                "latest_gain": round(float(latest_gain.mastery_gain), 1) if latest_gain else 0.0,
            })

        return {
            "is_homeroom": is_homeroom,
            "homeroom_class": {
                "id": target_class.id,
                "name": target_class.name,
                "grade": target_class.grade,
                "section": target_class.section,
                "academic_year": target_class.academic_year,
            },
            "announcement": (
                {
                    "id": ann.id,
                    "class_id": ann.class_id,
                    "message": ann.message,
                    "updated_at": ann.updated_at.isoformat(),
                }
                if ann
                else None
            ),
            "students": students_data,
        }

    @staticmethod
    def get_class_announcement(actor_id, actor_role, class_id):
        TeacherPortalService._verify_class_or_homeroom_access(actor_id, actor_role, class_id)
        ann = (
            ClassAnnouncement.query.filter_by(class_id=class_id, is_active=True)
            .order_by(ClassAnnouncement.updated_at.desc())
            .first()
        )
        return {
            "class_id": class_id,
            "announcement": (
                {
                    "id": ann.id,
                    "class_id": ann.class_id,
                    "teacher_id": ann.teacher_id,
                    "message": ann.message,
                    "updated_at": ann.updated_at.isoformat(),
                }
                if ann
                else None
            ),
        }

    @staticmethod
    def upsert_class_announcement(actor_id, actor_role, class_id, message):
        TeacherPortalService._verify_class_or_homeroom_access(actor_id, actor_role, class_id)
        clean_msg = (message or "").strip()
        if not clean_msg:
            raise ValueError("Announcement message cannot be blank.")

        ann = (
            ClassAnnouncement.query.filter_by(class_id=class_id, is_active=True)
            .order_by(ClassAnnouncement.updated_at.desc())
            .first()
        )
        if ann:
            ann.message = clean_msg
            ann.teacher_id = actor_id
            ann.updated_at = datetime.utcnow()
        else:
            ann = ClassAnnouncement(
                class_id=class_id,
                teacher_id=actor_id,
                message=clean_msg,
                is_active=True,
            )
            db.session.add(ann)

        db.session.commit()
        AuditService.log_event(
            action="teacher.update_announcement",
            entity_type="ClassAnnouncement",
            entity_id=ann.id,
            actor_id=actor_id,
            metadata_json={"class_id": class_id},
            commit=True,
        )
        return {
            "id": ann.id,
            "class_id": ann.class_id,
            "message": ann.message,
            "updated_at": ann.updated_at.isoformat(),
        }

    @staticmethod
    def record_class_attendance(actor_id, actor_role, class_id, payload):
        TeacherPortalService._verify_class_or_homeroom_access(actor_id, actor_role, class_id)
        records = payload.get("records")
        if not isinstance(records, list) or not records:
            raise ValueError("records must be a non-empty list of attendance entries.")

        date_str = payload.get("attendance_date")
        att_date = date.fromisoformat(date_str) if date_str else datetime.utcnow().date()
        enrolled_ids = {
            e.student_id
            for e in Enrollment.query.filter_by(class_id=class_id, status="active").all()
        }

        updated = 0
        for item in records:
            sid = item.get("student_id")
            st = (item.get("status") or "").strip().lower()
            if sid not in enrolled_ids:
                raise ValueError(f"Student ID {sid} is not actively enrolled in class {class_id}.")
            if st not in ("present", "absent", "late", "excused"):
                raise ValueError("status must be 'present', 'absent', 'late', or 'excused'.")

            existing = AttendanceRecord.query.filter_by(
                student_id=sid, class_id=class_id, attendance_date=att_date
            ).first()
            if existing:
                existing.status = st
                existing.recorded_by = actor_id
            else:
                db.session.add(
                    AttendanceRecord(
                        student_id=sid,
                        class_id=class_id,
                        attendance_date=att_date,
                        status=st,
                        recorded_by=actor_id,
                    )
                )
            updated += 1

        db.session.commit()
        return {"class_id": class_id, "attendance_date": att_date.isoformat(), "updated_count": updated}

    @staticmethod
    def get_topic_analytics(actor_id, actor_role, class_id, topic_id):
        """Return topic mastery distribution, recurrent error patterns, and question breakdown for a class."""
        TeacherPortalService._verify_class_or_homeroom_access(actor_id, actor_role, class_id)
        topic = db.session.get(Topic, topic_id)
        if not topic:
            raise LookupError(f"Topic with ID {topic_id} not found.")

        enrollments = Enrollment.query.filter_by(class_id=class_id, status="active").all()
        student_ids = [e.student_id for e in enrollments]

        bands = {
            "Needs strong support": 0,
            "Developing": 0,
            "Proficient": 0,
            "Secure": 0,
        }
        student_scores = []
        for e in enrollments:
            m = MasteryService.get_latest_mastery(e.student_id, topic_id)
            bands[m["band"]] = bands.get(m["band"], 0) + 1
            student_scores.append({
                "student_id": e.student_id,
                "student_name": e.student.name if e.student else None,
                "mastery_score": m["mastery_score"],
                "band": m["band"],
                "evidence_count": m["evidence_count"],
            })

        avg_mastery = (
            round(sum(s["mastery_score"] for s in student_scores) / float(len(student_scores)), 1)
            if student_scores
            else 0.0
        )

        # Error patterns for this topic in this class
        flags = (
            ErrorPatternFlag.query.filter(
                ErrorPatternFlag.topic_id == topic_id,
                ErrorPatternFlag.student_id.in_(student_ids) if student_ids else False,
            ).all()
            if student_ids
            else []
        )
        ep_counts = {}
        for f in flags:
            tag_name = f.error_tag.name if f.error_tag else f"tag_{f.error_tag_id}"
            if tag_name not in ep_counts:
                ep_counts[tag_name] = {"id": f.error_tag_id, "label": tag_name, "count": 0}
            ep_counts[tag_name]["count"] += 1

        # Question accuracy across enrolled students' scored attempts
        diff_labels = {1: "easy", 2: "medium", 3: "hard"}
        questions_data = []
        for q in Question.query.filter_by(topic_id=topic_id).order_by(Question.id.asc()).all():
            answers = (
                Answer.query.join(Attempt, Answer.attempt_id == Attempt.id)
                .filter(
                    Answer.question_id == q.id,
                    Attempt.student_id.in_(student_ids),
                    Attempt.status.in_(["submitted", "scored"]),
                )
                .all()
                if student_ids
                else []
            )
            tot = len(answers)
            correct = sum(1 for a in answers if a.is_correct)
            questions_data.append({
                "id": q.id,
                "text": q.question_text,
                "difficulty": diff_labels.get(q.difficulty, "medium"),
                "difficulty_level": q.difficulty,
                "total_responses": tot,
                "correct_count": correct,
                "missed_count": tot - correct,
                "correct_rate": round((correct / float(tot)) * 100.0, 1) if tot > 0 else 0.0,
            })

        return {
            "class_id": class_id,
            "topic_id": topic_id,
            "topic_name": topic.title,
            "average_mastery": avg_mastery,
            "distribution": [{"label": k, "students": v} for k, v in bands.items()],
            "error_patterns": sorted(ep_counts.values(), key=lambda x: -x["count"]),
            "questions": questions_data,
            "students": student_scores,
        }

    @staticmethod
    def get_student_profile(actor_id, actor_role, student_id):
        """Return detailed multi-subject profile, 30-day calendar, chapters, notes, and interventions."""
        student, enrollment = TeacherPortalService._verify_student_teaching_access(
            actor_id, actor_role, student_id
        )
        classroom = enrollment.classroom if enrollment else None

        # Multi-subject scores strictly for student_id
        subject_scores = []
        math_subject = None
        for subj in Subject.query.filter_by(status="active").order_by(Subject.id.asc()).all():
            topics = Topic.query.filter_by(subject_id=subj.id).all()
            assessed = []
            for t in topics:
                m = MasteryService.get_latest_mastery(student.id, t.id)
                if m["evidence_count"] > 0:
                    assessed.append(m["mastery_score"])
            avg = round(sum(assessed) / float(len(assessed)), 1) if assessed else 0.0
            subject_scores.append({"subject_id": subj.id, "subject": subj.name, "mastery": avg})
            if math_subject is None and (subj.code == "MATH-9-UI" or len(topics) > 0):
                math_subject = subj

        # 30-day daily calendar from StudentDailyActivity
        today_date = datetime.utcnow().date()
        start_30 = today_date - timedelta(days=29)
        daily_rows = (
            StudentDailyActivity.query.filter_by(student_id=student.id)
            .filter(StudentDailyActivity.activity_date >= start_30)
            .all()
        )
        daily_by_date = {r.activity_date: r for r in daily_rows}
        calendar_days = []
        for offset in range(30):
            d = start_30 + timedelta(days=offset)
            rec = daily_by_date.get(d)
            mins = int(rec.active_minutes or 0) if rec else 0
            st = "high" if mins >= 40 else ("med" if mins > 0 else "none")
            calendar_days.append({"day": d.day, "date": d.isoformat(), "status": st, "mins": mins})

        # Recent activities from StudySession
        sessions = (
            StudySession.query.filter_by(user_id=student.id)
            .order_by(StudySession.started_at.desc())
            .limit(15)
            .all()
        )
        recent_activities = [
            {
                "id": s.id,
                "date": s.started_at.strftime("%b %d"),
                "duration": s.duration_minutes,
                "activity_type": s.activity_type,
                "title": s.title,
                "score": s.score_percentage,
            }
            for s in sessions
        ]

        # Lesson progression for main subject
        lesson_progression = []
        if math_subject:
            topics = Topic.query.filter_by(subject_id=math_subject.id).order_by(Topic.order_index.asc()).all()
            reviewed_ids = {
                rv.resource_id for rv in ResourceView.query.filter_by(student_id=student.id).all()
            }
            for t in topics:
                m = MasteryService.get_latest_mastery(student.id, t.id)
                res_viewed = sum(1 for r in t.resources if r.id in reviewed_ids)
                lesson_progression.append({
                    "topic_id": t.id,
                    "chapter": t.title,
                    "mastery": m["mastery_score"],
                    "band": m["band"],
                    "resources_viewed": res_viewed,
                    "total_resources": len([r for r in t.resources if r.approved]),
                    "status": (
                        "completed" if m["mastery_score"] >= t.mastery_threshold
                        else ("in_progress" if m["evidence_count"] > 0 else "not_started")
                    ),
                })

        notes = [
            {
                "id": fb.id,
                "teacher_name": fb.teacher.name if fb.teacher else "Faculty",
                "comment": fb.comment_text,
                "tags": fb.tags_json or [],
                "is_visible_to_student": fb.is_visible_to_student,
                "created_at": fb.created_at.isoformat(),
            }
            for fb in TeacherFeedback.query.filter_by(student_id=student.id)
            .order_by(TeacherFeedback.created_at.desc())
            .all()
        ]

        inv_links = InterventionStudent.query.filter_by(student_id=student.id).all()
        interventions = []
        for link in inv_links:
            inv = db.session.get(Intervention, link.intervention_id)
            if inv is None:
                continue
            inv_topic = db.session.get(Topic, inv.topic_id) if inv.topic_id else None
            interventions.append({
                "id": inv.id,
                "title": inv.title,
                "topic": inv_topic.title if inv_topic else None,
                "status": inv.status,
                "before_mastery": link.before_mastery,
                "after_mastery": link.after_mastery,
                "outcome": link.outcome,
            })

        flags = ErrorPatternFlag.query.filter_by(student_id=student.id).all()
        error_flags = [
            {
                "id": f.id,
                "topic": f.topic.title if f.topic else None,
                "tag_name": f.error_tag.name if f.error_tag else None,
                "match_count": f.match_count,
                "status": f.status,
            }
            for f in flags
        ]

        return {
            "student": {
                "id": student.id,
                "public_id": student.public_id,
                "name": student.name,
                "email": student.email,
                "class_id": classroom.id if classroom else None,
                "class_name": classroom.name if classroom else "Unassigned",
            },
            "subject_scores": subject_scores,
            "calendar_days": calendar_days,
            "recent_activities": recent_activities,
            "lesson_progression": lesson_progression,
            "notes": notes,
            "interventions": interventions,
            "error_flags": error_flags,
        }

    @staticmethod
    def add_student_note(actor_id, actor_role, student_id, payload):
        """Persist qualitative teacher feedback note for an enrolled student."""
        student, enrollment = TeacherPortalService._verify_student_teaching_access(
            actor_id, actor_role, student_id
        )
        comment = (payload.get("comment_text") or payload.get("comment") or payload.get("note") or "").strip()
        if not comment:
            raise ValueError("Note comment_text cannot be blank.")

        tags = payload.get("tags") or []
        if not isinstance(tags, list):
            raise ValueError("tags must be a list of strings.")

        fb = TeacherFeedback(
            student_id=student.id,
            teacher_id=actor_id,
            class_id=enrollment.class_id if enrollment else None,
            subject_id=payload.get("subject_id"),
            comment_text=comment,
            tags_json=[str(t).strip() for t in tags if str(t).strip()],
            is_visible_to_student=bool(payload.get("is_visible_to_student", True)),
        )
        db.session.add(fb)
        db.session.commit()

        AuditService.log_event(
            action="teacher.add_note",
            entity_type="TeacherFeedback",
            entity_id=fb.id,
            actor_id=actor_id,
            metadata_json={"student_id": student.id},
            commit=True,
        )
        return {
            "id": fb.id,
            "student_id": fb.student_id,
            "teacher_name": fb.teacher.name if fb.teacher else "Faculty",
            "comment": fb.comment_text,
            "tags": fb.tags_json,
            "is_visible_to_student": fb.is_visible_to_student,
            "created_at": fb.created_at.isoformat(),
        }

    @staticmethod
    def assign_student_practice(actor_id, actor_role, student_id, payload):
        """Assign a targeted practice task and notification reminder to a student."""
        student, enrollment = TeacherPortalService._verify_student_teaching_access(
            actor_id, actor_role, student_id
        )
        topic_id = payload.get("topic_id")
        topic = db.session.get(Topic, topic_id) if topic_id else None
        if topic_id and not topic:
            raise LookupError(f"Topic with ID {topic_id} not found.")

        title = (payload.get("title") or "").strip()
        if not title and topic:
            title = f"Complete targeted practice in {topic.title}"
        if not title:
            raise ValueError("Practice title or topic_id is required.")

        message = (payload.get("message") or f"Assigned practice task: {title}").strip()

        task = StudentTask(student_id=student.id, title=title, is_done=False)
        rem = StudentReminder(
            recipient_user_id=student.id,
            sender_user_id=actor_id,
            class_id=enrollment.class_id if enrollment else None,
            title=title,
            message=message,
            reminder_type="intervention",
            is_read=False,
        )
        db.session.add_all([task, rem])
        db.session.commit()

        AuditService.log_event(
            action="teacher.assign_practice",
            entity_type="StudentTask",
            entity_id=task.id,
            actor_id=actor_id,
            metadata_json={"student_id": student.id, "topic_id": topic_id},
            commit=True,
        )
        return {
            "task": {"id": task.id, "title": task.title, "is_done": task.is_done},
            "reminder": {"id": rem.id, "title": rem.title, "message": rem.message},
        }
