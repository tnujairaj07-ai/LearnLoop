/**
 * A horizontal mastery indicator. Deliberately avoids red/green
 * pass-fail coloring — uses the primary/growth/attention palette so a
 * lower score reads as "needs more practice," not "failing."
 */
export default function MasteryBar({ value, label, size = "md" }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 75 ? "growth" : pct >= 45 ? "primary" : "attention";

  const barColor = {
    growth: "bg-growth",
    primary: "bg-primary",
    attention: "bg-attention",
  }[tone];

  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-ink/70">{label}</span>
          <span className="font-medium text-ink">{pct}%</span>
        </div>
      )}
      <div
        className={`hc-border w-full overflow-hidden rounded-full border border-border bg-paper ${height}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Mastery"}
      >
        <div
          className={`${height} ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
