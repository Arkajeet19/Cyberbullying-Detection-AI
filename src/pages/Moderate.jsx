import { useState } from "react";
import { moderateText } from "../api";

function formatLabel(label) {
  return label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Moderate() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      setError("");
      const data = await moderateText(text);
      setResult(data.labels);
    } catch (err) {
      console.error(err);
      setError("Backend connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const detected = result
    ? Object.entries(result)
        .filter(([key, value]) => key !== "not_cyberbullying" && value.flagged === 1)
        .map(([key, value]) => ({ key, confidence: value.confidence }))
        .sort((a, b) => b.confidence - a.confidence)
    : [];

  const allScores = result
    ? Object.entries(result)
        .map(([key, value]) => ({ key, confidence: value.confidence }))
        .sort((a, b) => b.confidence - a.confidence)
    : [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="font-display text-4xl mb-3">Moderate content</h1>
        <p className="text-paper-dim">Submit text to run it through the classifier.</p>
      </div>

      <div className="cg-panel p-6">
        <textarea
          className="cg-input w-full h-40 p-4 text-base resize-none"
          placeholder="Enter text to analyze..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={analyze}
          disabled={loading || !text.trim()}
          className="cg-btn cg-btn-signal w-full mt-4 py-3 text-sm"
        >
          {loading ? "Analyzing..." : "Analyze text"}
        </button>

        {error && (
          <div className="mt-4 border border-alarm/40 bg-alarm/10 rounded p-4 text-alarm text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 border-t border-panel-line pt-6">
            {detected.length > 0 ? (
              <div className="space-y-2 mb-6">
                {detected.map(({ key, confidence }) => (
                  <div key={key} className="cg-badge cg-badge-signal">
                    {formatLabel(key)}
                    <span className="cg-mono">{(confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cg-badge cg-badge-clear mb-6">Clean — no cyberbullying detected</div>
            )}

            <details>
              <summary className="cursor-pointer text-paper-dim text-sm hover:text-paper transition-colors">
                Full confidence breakdown
              </summary>
              <div className="mt-4 space-y-3">
                {allScores.map(({ key, confidence }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-paper-dim shrink-0">{formatLabel(key)}</span>
                    <div className="cg-trace-track flex-1">
                      <div
                        className="cg-trace-fill"
                        style={{
                          width: `${(confidence * 100).toFixed(1)}%`,
                          background: confidence > 0.5 ? "var(--color-signal)" : "var(--color-clear)",
                        }}
                      />
                    </div>
                    <span className="w-12 text-right cg-mono text-xs text-paper-dim">
                      {(confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default Moderate;
