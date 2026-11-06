import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { startQuiz, submitQuizAttempt, getSimilarQuestion } from "../../api/client";
import PageShell from "../../components/PageShell";
import MasteryBar from "../../components/MasteryBar";

export default function Quiz() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "quiz";
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    startQuiz(user.id, topicId, mode).then((res) => {
      setQuiz(res);
      setQuestions(res.questions);
    });
  }, [user.id, topicId, mode]);

  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const current = questions[index];
  const isLastQuestion = index === questions.length - 1;
  const isCorrect =
    submitted && current && selected.trim().toLowerCase() === current.correctAnswer.trim().toLowerCase();

  function handleSelect(value) {
    if (submitted) return;
    setSelected(value);
  }

  function handleSubmitAnswer() {
    if (!selected) return;
    setSubmitted(true);
    setAnswers((prev) => [
      ...prev,
      {
        questionId: current.id,
        response: selected,
        correct: selected.trim().toLowerCase() === current.correctAnswer.trim().toLowerCase(),
      },
    ]);
  }

  async function handleTrySimilar() {
    setLoadingSimilar(true);
    try {
      const similar = await getSimilarQuestion(user.id, current.id);
      const next = [...questions];
      next.splice(index + 1, 0, similar);
      setQuestions(next);
      goNext();
    } finally {
      setLoadingSimilar(false);
    }
  }

  function goNext() {
    setSelected("");
    setSubmitted(false);
    setShowHint(false);
    setIndex((i) => i + 1);
  }

  async function handleFinish() {
    clearInterval(timerRef.current);
    const summary = await submitQuizAttempt(user.id, quiz.quizId, answers, seconds);
    setResult(summary);
  }

  if (!quiz) {
    return (
      <PageShell title="Loading quiz…">
        <p className="hc-muted text-ink/60">Preparing your questions.</p>
      </PageShell>
    );
  }

  if (result) {
    return (
      <PageShell title="Quiz complete">
        <div className="hc-border rounded-card border border-border bg-white p-6">
          <p className="hc-muted text-sm text-ink/60">{quiz.topicTitle}</p>
          <div className="mt-3 grid grid-cols-3 gap-4 text-center">
            <Stat label="Score" value={`${result.score}/${result.total}`} />
            <Stat label="Accuracy" value={`${result.accuracy}%`} />
            <Stat label="Time" value={formatTime(result.timeTakenSec)} />
          </div>

          <div className="mt-6">
            <p className="mb-1 text-sm text-ink/70">Topic mastery update</p>
            <MasteryBar value={result.masteryAfter} />
            <p className="hc-muted mt-1 text-xs text-ink/50">
              {result.masteryBefore}% → {result.masteryAfter}%
            </p>
          </div>

          <div className="mt-6 rounded-card bg-primary-light p-4">
            <p className="text-sm font-medium text-primary-dark">Next recommended</p>
            <p className="hc-muted mt-1 text-sm text-ink/70">{result.nextRecommendedAction.reason}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/topic/${topicId}`)}
              className="rounded-card border border-border px-4 py-2 text-sm font-medium text-ink/80 hover:bg-paper"
            >
              Back to topic
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={quiz.topicTitle} subtitle={mode === "practice" ? "Practice mode" : "Quiz mode"}>
      <div className="mb-4 flex items-center justify-between text-sm text-ink/60">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span className="hc-border rounded-full border border-border px-2.5 py-1 text-xs">
          ⏱ {formatTime(seconds)}
        </span>
      </div>

      <div className="hc-border rounded-card border border-border bg-white p-6">
        <p className="font-display text-lg font-semibold text-ink">{current.prompt}</p>

        {current.type === "mcq" ? (
          <div className="mt-4 space-y-2">
            {current.options.map((opt) => {
              const isChosen = selected === opt;
              const showAsCorrect = submitted && opt === current.correctAnswer;
              const showAsWrong = submitted && isChosen && opt !== current.correctAnswer;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={submitted}
                  className={`hc-border block w-full rounded-card border px-4 py-2.5 text-left text-sm transition-colors ${
                    showAsCorrect
                      ? "border-growth bg-growth-light text-growth"
                      : showAsWrong
                        ? "border-attention bg-attention-light text-attention"
                        : isChosen
                          ? "border-primary bg-primary-light text-primary-dark"
                          : "border-border hover:bg-paper"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            type="text"
            value={selected}
            disabled={submitted}
            onChange={(e) => setSelected(e.target.value)}
            placeholder="Type your answer"
            className="hc-border mt-4 w-full rounded-card border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        )}

        {!submitted && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSubmitAnswer}
              disabled={!selected}
              className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Submit answer
            </button>
            <button
              onClick={() => setShowHint(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Need a hint?
            </button>
          </div>
        )}

        {showHint && !submitted && (
          <p className="mt-3 rounded-card bg-paper p-3 text-sm text-ink/70">💡 {current.hint}</p>
        )}

        {submitted && (
          <div
            className={`mt-4 rounded-card p-4 text-sm ${
              isCorrect ? "bg-growth-light text-growth" : "bg-attention-light text-attention"
            }`}
          >
            <p className="font-medium">{isCorrect ? "Correct!" : "Not quite."}</p>
            <p className="mt-1 text-ink/70">{current.explanation}</p>
            {!isCorrect && !current.hint && null}
            {!isCorrect && (
              <button
                onClick={handleTrySimilar}
                disabled={loadingSimilar}
                className="mt-3 rounded-card border border-attention/30 bg-white px-3 py-1.5 text-xs font-medium text-attention hover:bg-attention-light"
              >
                {loadingSimilar ? "Loading…" : "Try similar question"}
              </button>
            )}
          </div>
        )}

        {submitted && (
          <button
            onClick={isLastQuestion ? handleFinish : goNext}
            className="mt-5 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            {isLastQuestion ? "Finish" : "Next question"}
          </button>
        )}
      </div>
    </PageShell>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="font-display text-2xl font-semibold text-ink">{value}</p>
      <p className="hc-muted text-xs text-ink/50">{label}</p>
    </div>
  );
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
