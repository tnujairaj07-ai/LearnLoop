import re
from datetime import datetime
from urllib.parse import urlparse

from app.extensions import db
from app.models.academic import Prerequisite, Resource, Skill, Subject, Topic
from app.models.content import ErrorTag, Question, QuestionErrorTag
from app.models.user import User


class ContentValidationError(ValueError):
    """Raised when content validation fails."""
    def __init__(self, message, field=None, code="VALIDATION_ERROR"):
        super().__init__(message)
        self.message = message
        self.field = field
        self.code = code

    def to_dict(self):
        err = {"code": self.code, "message": self.message}
        if self.field:
            err["field"] = self.field
        return err


class ContentService:
    # ---------------------------------------------------------
    # Serialization Helpers
    # ---------------------------------------------------------
    @staticmethod
    def serialize_question(question, is_student_safe=False):
        """
        Serializes a Question model instance into a dictionary.
        If is_student_safe is True, strictly omits correct_answer, explanation, and error_tags.
        """
        if question is None:
            return None

        data = {
            "id": question.id,
            "topic_id": question.topic_id,
            "skill_id": question.skill_id,
            "question_type": question.question_type,
            "question_text": question.question_text,
            "options": question.options_json or [],
            "difficulty": question.difficulty,
            "hint": question.hint,
            "approved": question.approved,
            "created_at": question.created_at.isoformat() if question.created_at else None,
            "updated_at": question.updated_at.isoformat() if question.updated_at else None,
        }

        if is_student_safe:
            # Student-safe content view: anti-cheating guarantees
            return data

        # Teacher / Admin view: include answer keys, explanations, and error patterns
        data["correct_answer"] = question.correct_answer
        data["explanation"] = question.explanation
        data["created_by"] = question.created_by
        data["error_tags"] = [
            {
                "id": qet.error_tag.id,
                "name": qet.error_tag.name,
                "description": qet.error_tag.description,
                "option_or_pattern": qet.option_or_pattern,
            }
            for qet in question.error_tags
            if qet.error_tag is not None
        ]
        return data

    @staticmethod
    def serialize_resource(resource):
        if resource is None:
            return None
        return {
            "id": resource.id,
            "topic_id": resource.topic_id,
            "title": resource.title,
            "resource_type": resource.resource_type,
            "url_or_path": resource.url_or_path,
            "description": resource.description,
            "difficulty": resource.difficulty,
            "approved": resource.approved,
            "created_by": resource.created_by,
            "created_at": resource.created_at.isoformat() if resource.created_at else None,
            "updated_at": resource.updated_at.isoformat() if resource.updated_at else None,
        }

    # ---------------------------------------------------------
    # Academic Hierarchy: Subjects, Topics, Skills, Prerequisites
    # ---------------------------------------------------------
    @staticmethod
    def get_subjects():
        """Retrieve all subjects with topic counts."""
        subjects = Subject.query.order_by(Subject.name.asc()).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "description": s.description,
                "data_source": s.data_source,
                "topics_count": len(s.topics),
            }
            for s in subjects
        ]

    @staticmethod
    def get_subject_by_id(subject_id):
        """Retrieve subject details with ordered topics."""
        subject = db.session.get(Subject, subject_id)
        if not subject:
            raise LookupError(f"Subject with ID {subject_id} not found.")

        ordered_topics = sorted(subject.topics, key=lambda t: t.order_index)
        return {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
            "description": subject.description,
            "data_source": subject.data_source,
            "topics": [
                {
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "order_index": t.order_index,
                    "mastery_threshold": t.mastery_threshold,
                    "skills_count": len(t.skills),
                }
                for t in ordered_topics
            ],
        }

    @staticmethod
    def create_subject(data):
        name = data.get("name", "").strip()
        code = data.get("code", "").strip().upper()
        description = data.get("description", "").strip()

        if not name:
            raise ContentValidationError("Subject name is required.", field="name")
        if not code:
            raise ContentValidationError("Subject code is required.", field="code")

        existing = Subject.query.filter_by(code=code).first()
        if existing:
            raise ContentValidationError(f"Subject code '{code}' already exists.", field="code")

        subject = Subject(name=name, code=code, description=description)
        db.session.add(subject)
        db.session.commit()
        return ContentService.get_subject_by_id(subject.id)

    @staticmethod
    def get_topic_details(topic_id):
        """Retrieve topic details with skills, prerequisites, and resources."""
        topic = db.session.get(Topic, topic_id)
        if not topic:
            raise LookupError(f"Topic with ID {topic_id} not found.")

        # Prerequisites: find topics required for this topic
        prereq_records = Prerequisite.query.filter_by(topic_id=topic.id).all()
        prereq_topics = []
        for pr in prereq_records:
            req = db.session.get(Topic, pr.required_topic_id)
            if req:
                prereq_topics.append({
                    "id": req.id,
                    "title": req.title,
                    "order_index": req.order_index,
                })

        return {
            "id": topic.id,
            "subject_id": topic.subject_id,
            "title": topic.title,
            "description": topic.description,
            "order_index": topic.order_index,
            "mastery_threshold": topic.mastery_threshold,
            "skills": [
                {"id": sk.id, "name": sk.name, "description": sk.description}
                for sk in topic.skills
            ],
            "prerequisites": prereq_topics,
            "resources": [ContentService.serialize_resource(r) for r in topic.resources if r.approved],
        }

    @staticmethod
    def create_topic(data):
        subject_id = data.get("subject_id")
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        order_index = data.get("order_index")
        mastery_threshold = data.get("mastery_threshold", 80.0)

        if not subject_id or not db.session.get(Subject, subject_id):
            raise ContentValidationError("Valid subject_id is required.", field="subject_id")
        if not title:
            raise ContentValidationError("Topic title is required.", field="title")
        if order_index is None or not isinstance(order_index, int) or order_index < 0:
            raise ContentValidationError("order_index must be a non-negative integer.", field="order_index")
        if not isinstance(mastery_threshold, (int, float)) or not (0 <= mastery_threshold <= 100):
            raise ContentValidationError("mastery_threshold must be between 0 and 100.", field="mastery_threshold")

        # Check unique constraint on (subject_id, title) and (subject_id, order_index)
        if Topic.query.filter_by(subject_id=subject_id, title=title).first():
            raise ContentValidationError(f"Topic '{title}' already exists for this subject.", field="title")
        if Topic.query.filter_by(subject_id=subject_id, order_index=order_index).first():
            raise ContentValidationError(f"Order index {order_index} is already taken in this subject.", field="order_index")

        topic = Topic(
            subject_id=subject_id,
            title=title,
            description=description,
            order_index=order_index,
            mastery_threshold=float(mastery_threshold),
        )
        db.session.add(topic)
        db.session.commit()
        return ContentService.get_topic_details(topic.id)

    @staticmethod
    def create_skill(data):
        topic_id = data.get("topic_id")
        name = (data.get("name") or "").strip()
        description = (data.get("description") or "").strip()

        if not topic_id or not db.session.get(Topic, topic_id):
            raise ContentValidationError("Valid topic_id is required.", field="topic_id")
        if not name:
            raise ContentValidationError("Skill name is required.", field="name")

        if Skill.query.filter_by(topic_id=topic_id, name=name).first():
            raise ContentValidationError(f"Skill '{name}' already exists for this topic.", field="name")

        skill = Skill(topic_id=topic_id, name=name, description=description)
        db.session.add(skill)
        db.session.commit()
        return {"id": skill.id, "topic_id": skill.topic_id, "name": skill.name, "description": skill.description}

    # ---------------------------------------------------------
    # Educational Resources
    # ---------------------------------------------------------
    @staticmethod
    def get_resources(topic_id=None, difficulty=None, resource_type=None, approved_only=True):
        query = Resource.query
        if topic_id:
            query = query.filter_by(topic_id=topic_id)
        if difficulty:
            query = query.filter_by(difficulty=difficulty)
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        if approved_only:
            query = query.filter_by(approved=True)

        resources = query.order_by(Resource.difficulty.asc(), Resource.title.asc()).all()
        return [ContentService.serialize_resource(r) for r in resources]

    @staticmethod
    def create_resource(data, user_id=None):
        topic_id = data.get("topic_id")
        title = (data.get("title") or "").strip()
        resource_type = (data.get("resource_type") or "").strip()
        url_or_path = (data.get("url_or_path") or "").strip()
        description = (data.get("description") or "").strip()
        difficulty = data.get("difficulty", 1)
        approved = bool(data.get("approved", False))

        if not topic_id or not db.session.get(Topic, topic_id):
            raise ContentValidationError("Valid topic_id is required.", field="topic_id")
        if not title:
            raise ContentValidationError("Resource title is required.", field="title")
        if not resource_type:
            raise ContentValidationError("Resource type is required.", field="resource_type")
        if not url_or_path:
            raise ContentValidationError("URL or path is required.", field="url_or_path")

        # Validate URL scheme or relative path
        parsed = urlparse(url_or_path)
        if not (parsed.scheme in ("http", "https") or url_or_path.startswith("/")):
            raise ContentValidationError("url_or_path must be a valid HTTP(S) URL or internal path.", field="url_or_path")

        if not isinstance(difficulty, int) or difficulty not in (1, 2, 3):
            raise ContentValidationError("Difficulty must be an integer between 1 and 3.", field="difficulty")

        resource = Resource(
            topic_id=topic_id,
            title=title,
            resource_type=resource_type,
            url_or_path=url_or_path,
            description=description,
            difficulty=difficulty,
            approved=approved,
            created_by=user_id,
        )
        db.session.add(resource)
        db.session.commit()
        return ContentService.serialize_resource(resource)

    # ---------------------------------------------------------
    # Error Pattern Tags
    # ---------------------------------------------------------
    @staticmethod
    def get_error_tags():
        tags = ErrorTag.query.order_by(ErrorTag.name.asc()).all()
        return [
            {"id": t.id, "name": t.name, "description": t.description, "created_at": t.created_at.isoformat()}
            for t in tags
        ]

    @staticmethod
    def create_error_tag(data):
        name = (data.get("name") or "").strip().lower()
        description = (data.get("description") or "").strip()

        if not name:
            raise ContentValidationError("Error tag name is required.", field="name")
        if not description:
            raise ContentValidationError("Error tag description is required.", field="description")

        if ErrorTag.query.filter_by(name=name).first():
            raise ContentValidationError(f"Error tag '{name}' already exists.", field="name")

        tag = ErrorTag(name=name, description=description)
        db.session.add(tag)
        db.session.commit()
        return {"id": tag.id, "name": tag.name, "description": tag.description, "created_at": tag.created_at.isoformat()}

    # ---------------------------------------------------------
    # Question Bank Management & Validation
    # ---------------------------------------------------------
    @staticmethod
    def get_questions(topic_id=None, skill_id=None, difficulty=None, question_type=None, approved=None, page=1, per_page=20, is_student_safe=False):
        query = Question.query

        if topic_id is not None:
            query = query.filter(Question.topic_id == topic_id)
        if skill_id is not None:
            query = query.filter(Question.skill_id == skill_id)
        if difficulty is not None:
            query = query.filter(Question.difficulty == difficulty)
        if question_type is not None:
            query = query.filter(Question.question_type == question_type)
        if approved is not None:
            query = query.filter(Question.approved == approved)
        elif is_student_safe:
            # Students can only view approved questions
            query = query.filter(Question.approved == True)

        page = max(1, page)
        per_page = min(100, max(1, per_page))

        total = query.count()
        pagination = query.order_by(Question.id.asc()).paginate(page=page, per_page=per_page, error_out=False)

        items = [ContentService.serialize_question(q, is_student_safe=is_student_safe) for q in pagination.items]

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages,
        }

    @staticmethod
    def get_question_by_id(question_id, is_student_safe=False):
        question = db.session.get(Question, question_id)
        if not question:
            raise LookupError(f"Question with ID {question_id} not found.")

        if is_student_safe and not question.approved:
            raise LookupError("Question is not available.")

        return ContentService.serialize_question(question, is_student_safe=is_student_safe)

    @staticmethod
    def create_question(data, user_id=None):
        """
        Creates a question with strict validation of instructional metadata,
        options, correct answer, explanation, hint, difficulty, and error tags.
        """
        topic_id = data.get("topic_id")
        skill_id = data.get("skill_id")
        question_type = (data.get("question_type") or "").strip().lower()
        question_text = (data.get("question_text") or "").strip()
        options = data.get("options")
        correct_answer = data.get("correct_answer")
        explanation = (data.get("explanation") or "").strip()
        hint = (data.get("hint") or "").strip()
        difficulty = data.get("difficulty")
        approved = bool(data.get("approved", False))
        error_tags = data.get("error_tags", [])  # list of tag IDs or {"error_tag_id": int, "option_or_pattern": str}

        # 1. Topic & Skill validation
        if not topic_id or not db.session.get(Topic, topic_id):
            raise ContentValidationError("A valid topic_id is required.", field="topic_id")

        if skill_id is not None:
            skill = db.session.get(Skill, skill_id)
            if not skill or skill.topic_id != topic_id:
                raise ContentValidationError(f"Skill ID {skill_id} does not belong to topic ID {topic_id}.", field="skill_id")

        # 2. Question text validation
        if not question_text:
            raise ContentValidationError("question_text is required.", field="question_text")
        if len(question_text) > 500:
            raise ContentValidationError("question_text cannot exceed 500 characters.", field="question_text")

        # 3. Question type validation
        valid_types = ("mcq", "numeric", "short_text")
        if question_type not in valid_types:
            raise ContentValidationError(f"question_type must be one of: {', '.join(valid_types)}.", field="question_type")

        # 4. Difficulty validation
        if difficulty is None or not isinstance(difficulty, int) or difficulty not in (1, 2, 3):
            raise ContentValidationError("difficulty must be an integer between 1 (Easy) and 3 (Hard).", field="difficulty")

        # 5. Correct answer, explanation, and hint validation
        if correct_answer is None or str(correct_answer).strip() == "":
            raise ContentValidationError("correct_answer is required.", field="correct_answer")
        correct_answer = str(correct_answer).strip()

        if not explanation:
            raise ContentValidationError("explanation is required.", field="explanation")
        if not hint:
            raise ContentValidationError("hint is required.", field="hint")

        # 6. Options validation for MCQs
        options_json = None
        if question_type == "mcq":
            if not isinstance(options, list) or len(options) < 2:
                raise ContentValidationError("Multiple-choice questions must have an options array with at least 2 choices.", field="options")

            option_ids = set()
            for idx, opt in enumerate(options):
                if not isinstance(opt, dict) or "id" not in opt or "text" not in opt:
                    raise ContentValidationError(f"Option item at index {idx} must be an object with 'id' and 'text'.", field="options")
                opt_id = str(opt["id"]).strip()
                opt_text = str(opt["text"]).strip()
                if not opt_id or not opt_text:
                    raise ContentValidationError(f"Option at index {idx} contains empty 'id' or 'text'.", field="options")
                if opt_id in option_ids:
                    raise ContentValidationError(f"Duplicate option ID '{opt_id}' found.", field="options")
                option_ids.add(opt_id)

            if correct_answer not in option_ids:
                raise ContentValidationError(f"correct_answer '{correct_answer}' does not match any provided option id ({', '.join(sorted(option_ids))}).", field="correct_answer")

            options_json = options

        # 7. Check uniqueness of (topic_id, question_text)
        existing = Question.query.filter_by(topic_id=topic_id, question_text=question_text).first()
        if existing:
            raise ContentValidationError("A question with the exact same text already exists under this topic.", field="question_text")

        # 8. Create Question record
        question = Question(
            topic_id=topic_id,
            skill_id=skill_id,
            question_type=question_type,
            question_text=question_text,
            options_json=options_json,
            correct_answer=correct_answer,
            explanation=explanation,
            hint=hint,
            difficulty=difficulty,
            approved=approved,
            created_by=user_id,
        )
        db.session.add(question)
        db.session.flush()

        # 9. Associate Error Tags
        if error_tags:
            for item in error_tags:
                tag_id = item if isinstance(item, int) else item.get("error_tag_id")
                option_pattern = None if isinstance(item, int) else item.get("option_or_pattern")

                tag = db.session.get(ErrorTag, tag_id)
                if not tag:
                    raise ContentValidationError(f"Error tag with ID {tag_id} does not exist.", field="error_tags")

                qet = QuestionErrorTag(
                    question_id=question.id,
                    error_tag_id=tag_id,
                    option_or_pattern=option_pattern,
                )
                db.session.add(qet)

        db.session.commit()
        return ContentService.get_question_by_id(question.id, is_student_safe=False)

    @staticmethod
    def update_question(question_id, data):
        """Updates a question's instructional metadata."""
        question = db.session.get(Question, question_id)
        if not question:
            raise LookupError(f"Question with ID {question_id} not found.")

        if "question_text" in data:
            q_text = str(data["question_text"]).strip()
            if not q_text:
                raise ContentValidationError("question_text cannot be blank.", field="question_text")
            if len(q_text) > 500:
                raise ContentValidationError("question_text cannot exceed 500 characters.", field="question_text")
            question.question_text = q_text

        if "difficulty" in data:
            diff = data["difficulty"]
            if not isinstance(diff, int) or diff not in (1, 2, 3):
                raise ContentValidationError("difficulty must be 1, 2, or 3.", field="difficulty")
            question.difficulty = diff

        if "explanation" in data:
            exp = str(data["explanation"]).strip()
            if not exp:
                raise ContentValidationError("explanation cannot be blank.", field="explanation")
            question.explanation = exp

        if "hint" in data:
            h = str(data["hint"]).strip()
            if not h:
                raise ContentValidationError("hint cannot be blank.", field="hint")
            question.hint = h

        if "correct_answer" in data:
            ans = str(data["correct_answer"]).strip()
            if not ans:
                raise ContentValidationError("correct_answer cannot be blank.", field="correct_answer")
            question.correct_answer = ans

        if "options" in data and question.question_type == "mcq":
            opts = data["options"]
            if not isinstance(opts, list) or len(opts) < 2:
                raise ContentValidationError("options must contain at least 2 choices.", field="options")
            question.options_json = opts

        if "approved" in data:
            question.approved = bool(data["approved"])

        question.updated_at = datetime.utcnow()
        db.session.commit()
        return ContentService.get_question_by_id(question.id, is_student_safe=False)

    @staticmethod
    def set_question_approval(question_id, approved):
        question = db.session.get(Question, question_id)
        if not question:
            raise LookupError(f"Question with ID {question_id} not found.")

        question.approved = bool(approved)
        question.updated_at = datetime.utcnow()
        db.session.commit()
        return {"id": question.id, "approved": question.approved}

    @staticmethod
    def delete_question(question_id):
        question = db.session.get(Question, question_id)
        if not question:
            raise LookupError(f"Question with ID {question_id} not found.")

        db.session.delete(question)
        db.session.commit()
        return {"deleted": True, "id": question_id}
