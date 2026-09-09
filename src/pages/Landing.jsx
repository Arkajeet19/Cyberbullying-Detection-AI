import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useInViewOnce } from "../hooks/useInViewOnce";

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

const CATEGORIES = [
  { label: "Threats", sample: 91, tone: "alarm" },
  { label: "Sexual Harassment", sample: 74, tone: "alarm" },
  { label: "Ethnic Hate", sample: 68, tone: "signal" },
  { label: "Gender Hate", sample: 63, tone: "signal" },
  { label: "Mental Hate", sample: 58, tone: "signal" },
  { label: "Body Shaming", sample: 52, tone: "signal" },
  { label: "Religious Hate", sample: 47, tone: "signal" },
  { label: "Political Hate", sample: 44, tone: "signal" },
  { label: "Discrimination", sample: 41, tone: "signal" },
  { label: "Trolling", sample: 34, tone: "signal" },
  { label: "Age Discrimination", sample: 29, tone: "clear" },
  { label: "Other Cyberbullying", sample: 22, tone: "clear" },
  { label: "Not Cyberbullying", sample: 6, tone: "clear" },
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

function CountUp({ target, suffix = "", duration = 1200 }) {
  const [ref, inView] = useInViewOnce({ threshold: 0.5 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let frame;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

const specs = [
  { render: () => <CountUp target={684} suffix="K+" />, label: "Training records" },
  { render: () => <CountUp target={13} />, label: "Moderation categories" },
  { render: () => "Linear SVM", label: "Word + char TF-IDF, calibrated" },
];

const PIPELINE_STEPS = [
  { label: "Text submitted", detail: "Post, comment, or chat message" },
  { label: "TF-IDF + SVM", detail: "Word & char n-gram features, calibrated" },
  { label: "Confidence score", detail: "Platt-scaled probability per category" },
  { label: "Moderator review", detail: "Approve, remove, warn, or ban" },
];

function PipelineDiagram() {
  const [ref, inView] = useInViewOnce({ threshold: 0.3 });

  return (
    <div ref={ref} className="cg-panel p-6 md:p-8 overflow-x-auto">
      <div className="flex items-stretch gap-2 md:gap-4 min-w-[640px]">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1">
            <div
              className={`flex-1 text-center transition-opacity duration-500 ${inView ? "opacity-100" : "opacity-30"}`}
              style={{ transitionDelay: `${i * 200}ms` }}
            >
              <div
                className="cg-mono text-xs mb-2 transition-colors duration-500"
                style={{
                  color: inView
                    ? (i === PIPELINE_STEPS.length - 1 ? "var(--color-clear)" : "var(--color-signal)")
                    : "var(--color-paper-dim)",
                  transitionDelay: `${i * 200}ms`,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="text-sm font-medium mb-1">{step.label}</div>
              <div className="text-xs text-paper-dim">{step.detail}</div>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className="cg-mono text-lg px-1 md:px-2 shrink-0 transition-colors duration-500"
                style={{
                  color: inView ? "var(--color-signal)" : "var(--color-paper-dim)",
                  transitionDelay: `${i * 200 + 100}ms`,
                }}
              >
                &rarr;
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const LOG_LINES = [
  { text: "> Initializing moderation engine...", tone: "dim" },
  { text: "> Loading TF-IDF vectorizers ......... OK", tone: "clear" },
  { text: "> Loading calibrated SVM ............. OK", tone: "clear" },
  { text: "> Analyzing incoming message ..........", tone: "dim" },
  { text: "  THREAT DETECTED", tone: "alarm" },
  { text: "  confidence: 91.4%  \u2192 queued for moderator review", tone: "dim" },
];

const logToneColor = {
  dim: "var(--color-paper-dim)",
  clear: "var(--color-clear)",
  alarm: "var(--color-alarm)",
};

function TerminalLog() {
  const [ref, inView] = useInViewOnce({ threshold: 0.4 });

  return (
    <div ref={ref} className="cg-panel p-6 md:p-8 cg-mono text-sm">
      <div className="text-paper-dim text-xs mb-4">cyberguard / live analysis</div>
      <div className="space-y-1.5">
        {LOG_LINES.map((line, i) => (
          <div
            key={i}
            className={inView ? "cg-reveal" : "opacity-0"}
            style={{ animationDelay: `${i * 220}ms`, color: logToneColor[line.tone] }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryPill({ label, sample, tone }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cg-badge cg-badge-signal cursor-default"
      style={{
        borderColor: hovered ? toneColor[tone] : undefined,
        color: hovered ? toneColor[tone] : undefined,
      }}
    >
      {label}
      {hovered && <span className="cg-mono">{sample}%</span>}
    </button>
  );
}

function CategoryPills() {
  return (
    <div>
      <div className="text-paper-dim text-xs cg-mono mb-4">
        13 categories — hover for a sample reading
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <CategoryPill key={c.label} {...c} />
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
            <div className="font-display text-3xl mb-1">{s.render()}</div>
            <div className="text-paper-dim text-sm">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="py-16 cg-grid-texture">
        <h2 className="cg-mono text-xs text-paper-dim mb-4">how it works</h2>
        <PipelineDiagram />
      </section>

      <section className="pb-16">
        <TerminalLog />
      </section>

      <section className="pb-16">
        <CategoryPills />
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
