import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SAMPLE_READING = [
  { label: "Threats", value: 91, tone: "alarm" },
  { label: "Trolling", value: 34, tone: "signal" },
  { label: "Not Cyberbullying", value: 6, tone: "clear" },
];

const toneColor = {
  alarm: "var(--color-alarm)",
  signal: "var(--color-signal)",
  clear: "var(--color-clear)",
};

const specs = [
  { value: "684K+", label: "Training records" },
  { value: "13", label: "Moderation categories" },
  { value: "Linear SVM", label: "Word + char TF-IDF, calibrated" },
];

const features = [
  {
    title: "Calibrated confidence, not a guess",
    desc: "Every call returns a Platt-scaled probability per category, not just a flag \u2014 the same number a moderator would want before acting.",
  },
  {
    title: "Full audit trail",
    desc: "Every submission is logged and timestamped. Nothing disappears after the request completes.",
  },
  {
    title: "Human review, not auto-removal",
    desc: "Flagged content is queued for a moderator to approve, remove, warn, or ban \u2014 the model assists, it doesn't decide alone.",
  },
  {
    title: "Live analytics",
    desc: "Category breakdowns and moderation volume over time, so patterns surface before they become problems.",
  },
];

function SignalTrace() {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLive(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="cg-panel p-6 w-full max-w-sm">
      <div className="flex items-center justify-between mb-5">
        <span className="cg-mono text-xs text-paper-dim">sample reading</span>
        <span className="cg-mono text-xs text-paper-dim">live</span>
      </div>
      <div className="space-y-4">
        {SAMPLE_READING.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-paper">{row.label}</span>
              <span className="cg-mono text-xs" style={{ color: toneColor[row.tone] }}>
                {live ? row.value : 0}%
              </span>
            </div>
            <div className="cg-trace-track">
              <div
                className="cg-trace-fill"
                style={{
                  width: live ? `${row.value}%` : "0%",
                  background: toneColor[row.tone],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <section className="grid md:grid-cols-2 gap-12 items-center py-20">
        <div>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.05] mb-5">
            Read the signal in every message.
          </h1>
          <p className="text-paper-dim text-lg leading-relaxed mb-8 max-w-md">
            CyberGuard classifies harmful content in real time with a calibrated
            confidence score, logs every decision, and puts a human in the loop
            before anything is removed.
          </p>
          <div className="flex gap-3">
            <Link to="/moderate" className="cg-btn cg-btn-signal px-5 py-2.5 text-sm">
              Try it now
            </Link>
            <Link to="/analytics" className="cg-btn cg-btn-quiet px-5 py-2.5 text-sm">
              View analytics
            </Link>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <SignalTrace />
        </div>
      </section>

      <section className="border-y border-panel-line py-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-panel-line">
        {specs.map((s) => (
          <div key={s.label} className="text-center py-4 sm:py-0">
            <div className="font-display text-3xl mb-1">{s.value}</div>
            <div className="text-paper-dim text-sm">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="py-20 grid md:grid-cols-2 gap-x-12 gap-y-10">
        {features.map((f) => (
          <div key={f.title} className="flex gap-4">
            <div className="w-1 shrink-0 rounded-full" style={{ background: "var(--color-signal)" }} />
            <div>
              <h3 className="font-medium mb-1.5">{f.title}</h3>
              <p className="text-paper-dim text-sm leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Landing;
