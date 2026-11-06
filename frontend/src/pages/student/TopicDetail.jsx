import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getTopicDetails, markResourceReviewed } from "../../api/client";
import PageShell from "../../components/PageShell";
import MasteryBar from "../../components/MasteryBar";

const resourceTypeLabel = {
  video: "Video",
  note: "Notes",
  example: "Worked example",
};

export default function TopicDetail() {
  const { topicId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [reviewed, setReviewed] = useState({});

  useEffect(() => {
    let active = true;
    getTopicDetails(user.id, topicId).then((res) => active && setTopic(res));
    return () => {
      active = false;
    };
  }, [user.id, topicId]);

  async function handleReview(resourceId) {
    setReviewed((r) => ({ ...r, [resourceId]: true }));
    try {
      await markResourceReviewed(user.id, resourceId);
    } catch {
      // Non-blocking: keep the UI marked as reviewed even if the sync
      // fails silently in the background; a retry layer can be added
      // once Member 3's endpoint is live.
    }
  }

  if (!topic) {
    return (
      <PageShell title="Topic">
        <p className="hc-muted text-ink/60">Loading topic…</p>
      </PageShell>
    );
  }

  return (
    <PageShell title={topic.title}>
      <p className="hc-muted max-w-content text-ink/70">{topic.description}</p>

      <div className="hc-border mt-5 max-w-sm rounded-card border border-border bg-white p-4">
        <MasteryBar value={topic.mastery} label="Your mastery on this topic" />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Learning resources</h2>
        <ul className="mt-3 space-y-2">
          {topic.resources.map((r) => (
            <li
              key={r.id}
              className="hc-border flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-white p-4"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {resourceTypeLabel[r.type] || r.type}
                </p>
                <p className="mt-0.5 font-medium text-ink">{r.title}</p>
                <p className="hc-muted text-xs text-ink/50">{r.duration}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-card border border-border px-3 py-1.5 text-sm font-medium text-ink/80 hover:bg-paper">
                  Open
                </button>
                <button
                  onClick={() => handleReview(r.id)}
                  disabled={reviewed[r.id]}
                  className={`rounded-card px-3 py-1.5 text-sm font-medium ${
                    reviewed[r.id]
                      ? "bg-growth-light text-growth"
                      : "bg-paper text-ink/70 hover:bg-primary-light hover:text-primary-dark"
                  }`}
                >
                  {reviewed[r.id] ? "Reviewed ✓" : "I reviewed this"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Recommended next steps</h2>
        <ul className="hc-muted mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
          {topic.nextSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => navigate(`/quiz/${topicId}?mode=practice`)}
          className="rounded-card border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary-light"
        >
          Start practice
        </button>
        <button
          onClick={() => navigate(`/quiz/${topicId}?mode=quiz`)}
          className="rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Start quiz
        </button>
      </div>
    </PageShell>
  );
}
