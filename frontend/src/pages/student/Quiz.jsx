import { useEffect, useRef, useState } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  getTopicDetails,
  listStudentAssessments,
  startAssessmentAttempt,
  saveAttemptAnswer,
  submitAttempt,
  getAttemptResult,
  getSimilarQuestions,
  getStudentDashboard,
} from "../../api/client";
import PageShell from "../../components/PageShell";
import StudentNavbar from "../../components/StudentNavbar";

const inFlightStartRequests = new Map();

function startAttemptDeduplicated(assessmentId) {
  const key = String(assessmentId);
  if (!inFlightStartRequests.has(key)) {
    const req = startAssessmentAttempt(assessmentId).finally(() => {
      inFlightStartRequests.delete(key);
    });
    inFlightStartRequests.set(key, req);
  }
  return inFlightStartRequests.get(key);
}

function formatOptionDisplay(options, rawValue) {
  if (rawValue == null || rawValue === "") return "Not answered";
  if (Array.isArray(options)) {
    const found = options.find((opt) => {
      if (typeof opt === "object" && opt !== null) {
        return String(opt.id).toLowerCase() === String(rawValue).toLowerCase();
      }
      return String(opt).toLowerCase() === String(rawValue).toLowerCase();
    });
    if (found && typeof found === "object") {
      return `${String(found.id).toUpperCase()}) ${found.text}`;
    }
  }
  return String(rawValue);
}

export default function Quiz() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "quiz";
  const activityIdParam = searchParams.get("activityId") || "";
  const customTitle = searchParams.get("title") || "";
  const exerciseLabel = searchParams.get("exercise") || "";
  const subjectIdParam = searchParams.get("subjectId") || "";

  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [showHint, setShowHint] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [postMeta, setPostMeta] = useState({ mastery: null, nextAction: null });
  const [similarByQuestion, setSimilarByQuestion] = useState({});
  const [loadingSimilarId, setLoadingSimilarId] = useState(null);

  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const questionStartTimeRef = useRef(Date.now());
  const resolvedAssessmentIdRef = useRef(null);

  async function resolveAndStart() {
    setLoading(true);
    setErr("");
    setResult(null);

    try {
      let targetAssessmentId = /^\d+$/.test(activityIdParam)
        ? Number(activityIdParam)
        : null;

      if (!targetAssessmentId && /^\d+$/.test(String(topicId || ""))) {
        const tRes = await getTopicDetails(Number(topicId));
        const list = tRes?.topic?.assessments || [];
        if (list.length > 0) {
          const preferred =
            mode === "practice"
              ? list.find((a) => a.assessment_type === "practice")
              : mode === "reassess"
              ? list.find((a) => a.assessment_type === "reassessment")
              : list.find((a) => a.assessment_type !== "practice");
          targetAssessmentId = (preferred || list[0]).id;
        }
      }

      if (!targetAssessmentId) {
        const aRes = await listStudentAssessments({ status: "published" });
        const list = aRes?.assessments || [];
        const numericTopic = Number(topicId);
        const byTopic = Number.isFinite(numericTopic)
          ? list.find((a) => a.topic_id === numericTopic)
          : null;
        if (byTopic) targetAssessmentId = byTopic.id;
        else if (list.length > 0) targetAssessmentId = list[0].id;
      }

      if (!targetAssessmentId) {
        setErr(
          "No published assessment was found for this selection. Please choose one from the Practice Hub."
        );
        return;
      }

      resolvedAssessmentIdRef.current = targetAssessmentId;
      const startRes = await startAttemptDeduplicated(targetAssessmentId);
      const sess = startRes?.attempt || startRes;
      const qs = sess?.questions || [];

      setAttempt(sess);
      setQuestions(qs);

      const restored = {};
      let firstUnanswered = 0;
      qs.forEach((q, idx) => {
        if (q.saved_answer != null && q.saved_answer !== "") {
          restored[q.id] = q.saved_answer;
          if (idx === firstUnanswered) firstUnanswered = Math.min(idx + 1, qs.length - 1);
        }
      });
      setSelectedAnswers(restored);
      setIndex(firstUnanswered);
      setSeconds(0);
      questionStartTimeRef.current = Date.now();
    } catch (e) {
      const msg = e?.message || "";
      if (msg.toLowerCase().includes("already been submitted") && resolvedAssessmentIdRef.current) {
        try {
          const dash = await getStudentDashboard();
          const prevAttempt = (dash?.recent_attempts || []).find(
            (a) => a.assessment_id === resolvedAssessmentIdRef.current
          );
          if (prevAttempt) {
            const existingRes = await getAttemptResult(prevAttempt.id);
            setResult(existingRes?.result || existingRes);
            setPostMeta({
              mastery: dash?.overall_mastery ?? null,
              nextAction: dash?.next_recommended_action ?? null,
            });
            return;
          }
        } catch {
          // fall through to readable message
        }
      }
      setErr(msg || "Unable to start assessment attempt. Please check your enrollment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    resolveAndStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, activityIdParam, mode]);

  useEffect(() => {
    if (loading || err || result) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, err, result]);

  const current = questions[index];
  const currentSelected = current ? selectedAnswers[current.id] ?? "" : "";
  const isLastQuestion = questions.length > 0 && index === questions.length - 1;

  async function persistAnswer(questionId, answerText) {
    if (!attempt?.attempt_id || !questionId) return;
    const elapsedSec = Math.max(
      1,
      Math.round((Date.now() - questionStartTimeRef.current) / 1000)
    );
    questionStartTimeRef.current = Date.now();
    setSaveState("saving");
    try {
      await saveAttemptAnswer(attempt.attempt_id, {
        questionId,
        answerText,
        timeSpentSeconds: elapsedSec,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function handleSelectOption(optValue) {
    if (!current || submitting) return;
    setSelectedAnswers((prev) => ({ ...prev, [current.id]: optValue }));
    persistAnswer(current.id, optValue);
  }

  function handleTextChange(val) {
    if (!current || submitting) return;
    setSelectedAnswers((prev) => ({ ...prev, [current.id]: val }));
    setSaveState("idle");
  }

  function handleJumpQuestion(nextIdx) {
    if (current && currentSelected && saveState === "idle") {
      persistAnswer(current.id, currentSelected);
    }
    setShowHint(false);
    setSaveState("idle");
    questionStartTimeRef.current = Date.now();
    setIndex(nextIdx);
  }

  async function handleFinishAssessment() {
    if (!attempt?.attempt_id || submitting) return;
    setSubmitting(true);
    setErr("");
    try {
      if (current && currentSelected && saveState !== "saved") {
        await persistAnswer(current.id, currentSelected);
      }
      const res = await submitAttempt(attempt.attempt_id);
      const finalResult = res?.result || res;
      if (timerRef.current) clearInterval(timerRef.current);
      setResult(finalResult);

      try {
        const [dashRes, topicRes] = await Promise.allSettled([
          getStudentDashboard(),
          /^\d+$/.test(String(topicId || ""))
            ? getTopicDetails(Number(topicId))
            : Promise.resolve(null),
        ]);
        const dash = dashRes.status === "fulfilled" ? dashRes.value : null;
        const tDetail = topicRes.status === "fulfilled" ? topicRes.value : null;
        setPostMeta({
          mastery:
            tDetail?.topic?.mastery ?? dash?.overall_mastery ?? null,
          nextAction: dash?.next_recommended_action ?? null,
        });
      } catch {
        // non-blocking post-submit metadata enhancement
      }
    } catch (e) {
      setErr(e?.message || "Failed to submit assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadSimilar(questionId) {
    setLoadingSimilarId(questionId);
    try {
      const res = await getSimilarQuestions(questionId, 2);
      setSimilarByQuestion((prev) => ({
        ...prev,
        [questionId]: res?.questions || [],
      }));
    } catch {
      setSimilarByQuestion((prev) => ({ ...prev, [questionId]: [] }));
    } finally {
      setLoadingSimilarId(null);
    }
  }

  const modeLabel =
    mode === "practice"
      ? "Practice Drill"
      : mode === "assignment"
      ? "Exercise Assignment"
      : mode === "reassess"
      ? "Reassessment"
      : mode === "test"
      ? "Chapter Assessment"
      : "Quiz";

  const chapterDisplayTitle =
    customTitle || attempt?.assessment_title || result?.assessment_title || "Assessment";

  const backToPracticePath = subjectIdParam
    ? `/practice/${subjectIdParam}${topicId ? `/${topicId}` : ""}`
    : "/practice";

  if (loading) {
    return (
      <PageShell>
        <div className="flex-1 bg-[#f8fafd] min-h-screen">
          <StudentNavbar />
          <div className="max-w-4xl mx-auto p-8 sm:p-12 text-center mt-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-4 animate-bounce">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-800">
              Preparing Assessment Questions...
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Loading questions securely and syncing your attempt session.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (err && !result) {
    return (
      <PageShell>
        <div className="flex-1 bg-[#f8fafd] min-h-screen">
          <StudentNavbar />
          <div className="max-w-2xl mx-auto p-6 mt-10">
            <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-xs space-y-4">
              <h2 className="font-display text-lg font-bold text-rose-700">
                Could Not Open Assessment
              </h2>
              <p className="text-sm text-slate-600">{err}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(backToPracticePath)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Back to Practice Hub
                </button>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Student Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // RESULTS SCREEN
  if (result) {
    const accuracyRate = Math.round(Number(result.percentage ?? 0));
    const breakdown = result.questions || [];
    const correctCount = breakdown.filter((q) => q.is_correct).length;
    const totalQuestionsCount = breakdown.length;
    const timeTaken =
      result.total_time_spent_seconds > 0
        ? result.total_time_spent_seconds
        : seconds;

    return (
      <PageShell>
        <div className="flex-1 bg-[#f8fafd] min-h-screen">
          <StudentNavbar />

          <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <Link to={backToPracticePath} className="hover:text-blue-600 transition-colors">
                Practice Hub
              </Link>
              <span>/</span>
              <span className="text-blue-600 font-bold">Assessment Results</span>
            </div>

            {/* Achievement Banner */}
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-blue-100 mb-3 border border-white/20">
                    <span>🏆</span>
                    <span>{modeLabel} Submitted</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {chapterDisplayTitle}
                  </h1>
                  <p className="mt-1.5 text-sm text-blue-100 max-w-xl leading-relaxed">
                    {accuracyRate >= 80
                      ? "Strong result! You demonstrated high concept mastery and problem-solving consistency."
                      : accuracyRate >= 60
                      ? "Good progress! Review any missed steps below and try similar practice items to reach 80%+."
                      : "Practice checkpoint saved. Review the explanations below and complete a targeted drill."}
                  </p>
                </div>

                <div className="text-center sm:text-right shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20">
                  <div className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white">
                    {correctCount} / {totalQuestionsCount}
                  </div>
                  <p className="text-xs font-semibold text-blue-200 mt-0.5">
                    Questions Correct
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                    <span>{accuracyRate}% Accuracy</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Points Earned
                </p>
                <div className="mt-1 font-display text-2xl font-black text-slate-900">
                  {result.total_points_earned ?? correctCount}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    / {result.total_points_possible ?? totalQuestionsCount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Scored Server-Side
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Accuracy Rate
                </p>
                <div
                  className={`mt-1 font-display text-2xl font-black ${
                    accuracyRate >= 80
                      ? "text-emerald-600"
                      : accuracyRate >= 60
                      ? "text-blue-600"
                      : "text-amber-600"
                  }`}
                >
                  {accuracyRate}%
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {accuracyRate >= 80
                    ? "Secure"
                    : accuracyRate >= 60
                    ? "Proficient"
                    : accuracyRate >= 40
                    ? "Developing"
                    : "Needs Strong Support"}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Time Taken
                </p>
                <div className="mt-1 font-display text-2xl font-black text-slate-900">
                  {formatTime(timeTaken)}
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {Math.round(timeTaken / Math.max(totalQuestionsCount, 1))}s
                  per question
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Updated Mastery
                </p>
                <div className="mt-1 font-display text-2xl font-black text-blue-600">
                  {postMeta.mastery != null
                    ? `${Math.round(postMeta.mastery)}%`
                    : `${accuracyRate}%`}
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Saved to Mastery Profile
                </p>
              </div>
            </div>

            {postMeta.nextAction && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6 shadow-2xs">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    💡
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Recommended Next Step
                    </span>
                    <h4 className="font-display text-base font-bold text-slate-900 mt-0.5">
                      {postMeta.nextAction.topic}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                      {postMeta.nextAction.reason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Question-by-Question Review */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Question-by-Question Solution Review
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified answers, explanations, and any detected error
                    patterns
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  {correctCount} of {totalQuestionsCount} Correct
                </span>
              </div>

              <div className="space-y-4 pt-2">
                {breakdown.map((q, i) => {
                  const similarItems = similarByQuestion[q.question_id];
                  return (
                    <div
                      key={q.question_id || i}
                      className={`p-4 rounded-xl border transition-all ${
                        q.is_correct
                          ? "border-emerald-200/80 bg-emerald-50/30"
                          : "border-rose-200/80 bg-rose-50/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              q.is_correct ? "bg-emerald-600" : "bg-rose-500"
                            }`}
                          >
                            {q.is_correct ? "✓" : "✕"}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            Question {i + 1}
                          </span>
                          {q.detected_error_tag && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Suspected pattern: {q.detected_error_tag.name}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            q.is_correct ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {q.points_earned} / {q.points_possible} Marks
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900 mb-2">
                        {q.question_text}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                        <div className="p-2 rounded-lg bg-white/80 border border-slate-200/60">
                          <span className="text-slate-400 font-semibold block text-[10px]">
                            YOUR ANSWER
                          </span>
                          <span
                            className={`font-bold ${
                              q.is_correct ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {formatOptionDisplay(q.options, q.student_answer)}
                          </span>
                        </div>
                        {!q.is_correct && (
                          <div className="p-2 rounded-lg bg-white/80 border border-emerald-200">
                            <span className="text-slate-400 font-semibold block text-[10px]">
                              CORRECT ANSWER
                            </span>
                            <span className="font-bold text-emerald-700">
                              {formatOptionDisplay(q.options, q.correct_answer)}
                            </span>
                          </div>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200/50">
                          <span className="font-bold text-slate-700 block mb-0.5">
                            Explanation:
                          </span>
                          {q.explanation}
                        </div>
                      )}

                      {!q.is_correct && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => handleLoadSimilar(q.question_id)}
                            disabled={loadingSimilarId === q.question_id}
                            className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                          >
                            {loadingSimilarId === q.question_id
                              ? "Finding Similar Practice..."
                              : "⚡ Show Similar Practice Questions"}
                          </button>

                          {Array.isArray(similarItems) && (
                            <div className="mt-2.5 space-y-2">
                              {similarItems.length > 0 ? (
                                similarItems.map((sim, sIdx) => (
                                  <div
                                    key={sim.id || sIdx}
                                    className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5"
                                  >
                                    <p className="font-bold text-slate-800">
                                      Similar Practice {sIdx + 1}:{" "}
                                      {sim.question_text}
                                    </p>
                                    {Array.isArray(sim.options) &&
                                      sim.options.length > 0 && (
                                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                                          {sim.options.map((opt, oIdx) => (
                                            <span
                                              key={oIdx}
                                              className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200"
                                            >
                                              {typeof opt === "object"
                                                ? `${String(
                                                    opt.id
                                                  ).toUpperCase()}) ${opt.text}`
                                                : opt}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    {sim.hint && (
                                      <p className="text-[11px] text-amber-800">
                                        <strong>Hint:</strong> {sim.hint}
                                      </p>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-slate-500">
                                  No additional practice variants found for this
                                  item yet.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(backToPracticePath)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>←</span>
                  <span>Back to Practice Hub</span>
                </button>
                <Link
                  to="/analysis"
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all"
                >
                  View Mastery Analysis
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resolveAndStart}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Start New Attempt ↺
                </button>
                <Link
                  to="/dashboard"
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all"
                >
                  Student Dashboard
                </Link>
              </div>
            </div>
          </main>
        </div>
      </PageShell>
    );
  }

  // ACTIVE QUESTION RUNNER SCREEN
  const answeredCount = questions.filter(
    (q) => selectedAnswers[q.id] != null && String(selectedAnswers[q.id]).trim() !== ""
  ).length;
  const progressPercent = questions.length
    ? Math.round(((index + 1) / questions.length) * 100)
    : 0;

  return (
    <PageShell>
      <div className="flex-1 bg-[#f8fafd] min-h-screen">
        <StudentNavbar />

        <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <Link to={backToPracticePath} className="hover:text-blue-600 transition-colors">
                  Practice Hub
                </Link>
                <span>/</span>
                <span className="text-blue-600 font-bold">
                  {exerciseLabel || modeLabel}
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {chapterDisplayTitle}
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2 text-xs font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>⏱ {formatTime(seconds)}</span>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200/70">
                Question {index + 1} of {questions.length}
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Question Navigator Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {questions.map((q, qIdx) => {
                const isAnswered =
                  selectedAnswers[q.id] != null &&
                  String(selectedAnswers[q.id]).trim() !== "";
                const isActive = qIdx === index;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleJumpQuestion(qIdx)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : isAnswered
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                        : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-medium text-slate-500">
              {saveState === "saving"
                ? "Saving answer..."
                : saveState === "saved"
                ? "Saved to session ✓"
                : saveState === "error"
                ? "Autosave failed (will retry)"
                : `${answeredCount}/${questions.length} answered`}
            </span>
          </div>

          {/* Active Question Card */}
          {current && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                    Question {index + 1}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 capitalize">
                    Difficulty {current.difficulty ?? "Standard"}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {current.points || 1} Mark ·{" "}
                  {(current.question_type || "mcq").toUpperCase()}
                </span>
              </div>

              <div>
                <p className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                  {current.question_text}
                </p>
              </div>

              {Array.isArray(current.options) && current.options.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {current.options.map((opt, optIdx) => {
                    const isObj = typeof opt === "object" && opt !== null;
                    const optValue = isObj
                      ? String(opt.id ?? opt.value ?? opt.text)
                      : String(opt);
                    const optLabel = isObj
                      ? opt.text ?? String(opt.id)
                      : String(opt);
                    const letter = String(
                      isObj && opt.id ? opt.id : String.fromCharCode(65 + optIdx)
                    ).toUpperCase();
                    const isChosen =
                      String(currentSelected).toLowerCase() ===
                      optValue.toLowerCase();

                    return (
                      <button
                        key={optValue}
                        type="button"
                        onClick={() => handleSelectOption(optValue)}
                        className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between group cursor-pointer ${
                          isChosen
                            ? "border-blue-600 bg-blue-50/80 text-blue-950 font-bold ring-2 ring-blue-600/20 shadow-xs"
                            : "border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-300 text-slate-800 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isChosen
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-slate-200 text-slate-600 group-hover:border-blue-300 group-hover:text-blue-600"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="leading-snug">{optLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={currentSelected}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onBlur={() =>
                      currentSelected &&
                      persistAnswer(current.id, currentSelected)
                    }
                    placeholder="Type your numerical or short answer..."
                    className="w-full rounded-2xl border border-slate-200 p-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}

              {showHint && current.hint && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <span className="font-bold block mb-0.5">Hint:</span>
                    <p>{current.hint}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleJumpQuestion(Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  {current.hint && (
                    <button
                      type="button"
                      onClick={() => setShowHint((h) => !h)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>💡</span>
                      <span>{showHint ? "Hide Hint" : "Need a Hint?"}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {!isLastQuestion && (
                    <button
                      type="button"
                      onClick={() => handleJumpQuestion(index + 1)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                    >
                      Next Question →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFinishAssessment}
                    disabled={submitting || answeredCount === 0}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {submitting
                      ? "Scoring Assessment..."
                      : isLastQuestion
                      ? "Submit & View Results →"
                      : `Submit (${answeredCount}/${questions.length})`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PageShell>
  );
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
