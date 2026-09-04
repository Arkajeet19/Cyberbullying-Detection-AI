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
        .filter(([key, value]) => key !== "not_cyberbullying" && Number(value) === 1)
        .map(([key]) => key)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold mb-3">Moderate Content</h1>
        <p className="text-slate-400">
          Paste any text below to run it through CyberGuard's classifier.
        </p>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-800">
        <textarea
          className="w-full h-56 bg-slate-800 rounded-xl p-4 border border-slate-700 focus:outline-none focus:border-blue-500 text-lg resize-none"
          placeholder="Enter text to analyze..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={analyze}
          disabled={loading || !text.trim()}
          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all py-4 rounded-xl font-semibold text-lg shadow-lg"
        >
          {loading ? "Analyzing..." : "Analyze Text"}
        </button>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6">Analysis Results</h2>

            {detected.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detected.map((item) => (
                  <div
                    key={item}
                    className="bg-red-500/10 border border-red-500 rounded-xl p-5"
                  >
                    <span className="text-red-400 font-semibold text-lg">
                      🚨 {formatLabel(item)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500 rounded-xl p-5 text-center">
                <span className="text-green-400 font-semibold text-lg">
                  ✅ No cyberbullying detected
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Moderate;
