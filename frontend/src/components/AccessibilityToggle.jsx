import { useEffect, useState } from "react";

export default function AccessibilityToggle({ compact = false }) {
  const [largeText, setLargeText] = useState(
    () => localStorage.getItem("a11y-large-text") === "true"
  );
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem("a11y-high-contrast") === "true"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-large-text", String(largeText));
    localStorage.setItem("a11y-large-text", String(largeText));
  }, [largeText]);

  useEffect(() => {
    document.documentElement.setAttribute("data-high-contrast", String(highContrast));
    localStorage.setItem("a11y-high-contrast", String(highContrast));
  }, [highContrast]);

  return (
    <div className={compact ? "flex gap-2" : "flex flex-col gap-2"}>
      <button
        onClick={() => setLargeText((v) => !v)}
        aria-pressed={largeText}
        className={`hc-border rounded-card border px-3 py-1.5 text-xs font-medium ${
          largeText ? "border-primary/30 bg-primary-light text-primary-dark" : "border-border text-ink/60"
        }`}
      >
        Larger text {largeText ? "on" : "off"}
      </button>
      <button
        onClick={() => setHighContrast((v) => !v)}
        aria-pressed={highContrast}
        className={`hc-border rounded-card border px-3 py-1.5 text-xs font-medium ${
          highContrast ? "border-primary/30 bg-primary-light text-primary-dark" : "border-border text-ink/60"
        }`}
      >
        High contrast {highContrast ? "on" : "off"}
      </button>
    </div>
  );
}
