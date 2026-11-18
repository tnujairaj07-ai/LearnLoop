import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getTopicDetails, markResourceReviewed } from "../../api/client";
import PageShell from "../../components/PageShell";
import MasteryBar from "../../components/MasteryBar";

const resourceTypeLabel = {
  video: "Video",
  note: "Notes",
  notes: "Notes",
  example: "Worked Example",
  formula: "Formula Sheet",
  article: "Article",
};

export default function TopicDetail() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reviewed, setReviewed] = useState({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr("");

    getTopicDetails(topicId)
      .then((res) => {
        if (!active) return;
        const t = res?.topic || res;
        setTopic(t);
        const revMap = {};
        (t?.resources || []).forEach((r) => {
          if (r.reviewed) revMap[r.id] = true;
        });
        setReviewed(revMap);
      })
      .catch(() => active && setErr("Couldn't load topic details. Try refreshing."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [topicId]);

  async function handleReview(resourceId) {
    setReviewed((r) => ({ ...r, [resourceId]: true }));
    try {
      await markResourceReviewed(resourceId);
    } catch {
      // Non-blocking: UI keeps reviewed indicator cleanly
    }
  }

  if (loading) {
    return (
      <PageShell title="Topic">
        <div className="space-y-4 animate-pulse max-w-3xl">
          <div className="h-6 w-64 bg-slate-200 rounded-lg" />
          <div className="h-24 w-full bg-slate-200 rounded-2xl" />
          <div className="h-44 w-full bg-slate-200 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (err || !topic) {
    return (
      <PageShell title="Topic">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 flex items-center justify-between max-w-2xl">
          <span>{err || "Topic not found."}</span>
          <Link
            to="/roadmap"
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
          >
            Back to Roadmap
          </Link>
        </div>
      </PageShell>
    );
  }

  const practiceAssessment = (topic.assessments || []).find(
    (a) => a.assessment_type === "practice"
  );
  const quizAssessment =
    (topic.assessments || []).find(
      (a) => a.assessment_type !== "practice"
    ) || topic.assessments?.[0];

  const components = topic.components || {};
  const resources = topic.resources || [];
  const nextSteps = topic.next_steps || [];
  const errorPatterns = topic.active_error_patterns || [];

  return (
    <PageShell title={topic.title}>
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {topic.unit_name && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
              {topic.unit_name}
            </span>
          )}
          {topic.band && (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold capitalize">
              {topic.band}
            </span>
          )}
          <span>Evidence count: {topic.evidence_count ?? 0}</span>
        </div>

        <p className="hc-muted max-w-content text-ink/70">{topic.description}</p>

        {/* Mastery Bar + Explainable 4-Part Formula Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="hc-border rounded-card border border-border bg-white p-4">
            <MasteryBar
              value={Math.round(topic.mastery ?? 0)}
              label="Your mastery on this topic"
            />
            {topic.common_mistake_tip && (
              <p className="mt-3 text-xs text-amber-800 bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5">
                <strong className="font-semibold">Tip: </strong>
                {topic.common_mistake_tip}
              </p>
            )}
          </div>

          <div className="rounded-card border border-border bg-white p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Mastery Formula Breakdown
            </h2>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Accuracy (40%)</span>
                <span className="font-display font-bold text-slate-900 text-base">
                  {Math.round(components.accuracy ?? 0)}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Difficulty (20%)</span>
                <span className="font-display font-bold text-slate-900 text-base">
                  {Math.round(components.difficulty ?? 0)}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Recency (20%)</span>
                <span className="font-display font-bold text-slate-900 text-base">
                  {Math.round(components.recency ?? 0)}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Trend (20%)</span>
                <span className="font-display font-bold text-slate-900 text-base">
                  {Math.round(components.trend ?? 0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Suspected Recurrent Error Patterns (if flagged) */}
        {errorPatterns.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <h2 className="font-display text-sm font-bold text-amber-900 mb-2">
              Suspected Recurrent Error Patterns
            </h2>
            <ul className="space-y-2 text-xs text-amber-950">
              {errorPatterns.map((ep, idx) => (
                <li
                  key={ep.id || idx}
                  className="bg-white/80 rounded-xl p-3 border border-amber-200/70"
                >
                  <p className="font-semibold">{ep.title || ep.pattern_name}</p>
                  {ep.description && (
                    <p className="text-slate-600 mt-0.5">{ep.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Learning resources */}
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">
            Learning resources
          </h2>
          {resources.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {resources.map((r) => {
                const isExternal =
                  typeof r.url_or_path === "string" &&
                  /^https?:\/\//i.test(r.url_or_path);
                return (
                  <li
                    key={r.id}
                    className="hc-border flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-white p-4"
                  >
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        {resourceTypeLabel[String(r.type || "").toLowerCase()] ||
                          r.type}
                      </p>
                      <p className="mt-0.5 font-medium text-ink">{r.title}</p>
                      {r.description && (
                        <p className="hc-muted text-xs text-ink/50">
                          {r.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isExternal && (
                        <a
                          href={r.url_or_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleReview(r.id)}
                          className="rounded-card border border-border px-3 py-1.5 text-sm font-medium text-ink/80 hover:bg-paper"
                        >
                          Open ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleReview(r.id)}
                        disabled={reviewed[r.id]}
                        className={`rounded-card px-3 py-1.5 text-sm font-medium cursor-pointer ${
                          reviewed[r.id]
                            ? "bg-growth-light text-growth"
                            : "bg-paper text-ink/70 hover:bg-primary-light hover:text-primary-dark"
                        }`}
                      >
                        {reviewed[r.id] ? "Reviewed ✓" : "I reviewed this"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No resources linked to this topic yet.
            </p>
          )}
        </section>

        {/* Recommended next steps */}
        {nextSteps.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-ink">
              Recommended next steps
            </h2>
            <ul className="hc-muted mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
              {nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/quiz/${topicId}?mode=practice${
                  practiceAssessment?.id
                    ? `&activityId=${practiceAssessment.id}`
                    : ""
                }`
              )
            }
            className="rounded-card border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary-light cursor-pointer"
          >
            Start practice
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/quiz/${topicId}?mode=quiz${
                  quizAssessment?.id ? `&activityId=${quizAssessment.id}` : ""
                }`
              )
            }
            className="rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark cursor-pointer"
          >
            Start quiz
          </button>
        </div>
      </div>
    </PageShell>
  );
}
