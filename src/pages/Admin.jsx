import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { fetchAdminQueue, reviewItem } from "../api";

function formatLabel(label) {
  return label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Admin() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem("cg_admin_key") || "");
  const [unlocked, setUnlocked] = useState(false);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});

  const loadQueue = (key) => {
    setLoading(true);
    setError("");
    fetchAdminQueue(key)
      .then((data) => {
        setQueue(data.items);
        setUnlocked(true);
        localStorage.setItem("cg_admin_key", key);
      })
      .catch(() => {
        setError("Invalid admin key or connection failed.");
        setUnlocked(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (adminKey) loadQueue(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReview = async (id) => {
    try {
      await reviewItem(adminKey, id, notes[id] || "");
      setQueue((q) => q.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to submit review.");
    }
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <Lock className="mx-auto text-blue-500 mb-4" size={40} />
        <h1 className="text-2xl font-bold mb-6">Admin Access</h1>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Admin key"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
          onKeyDown={(e) => e.key === "Enter" && loadQueue(adminKey)}
        />
        <button
          onClick={() => loadQueue(adminKey)}
          disabled={loading || !adminKey}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Checking..." : "Unlock"}
        </button>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-extrabold mb-2">Review Queue</h1>
      <p className="text-slate-400 mb-8">{queue.length} items awaiting review</p>

      {queue.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
          Nothing pending — the queue is clear.
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => {
            const flags = Object.entries(item.labels)
              .filter(([k, v]) => k !== "not_cyberbullying" && v.flagged === 1)
              .map(([k, v]) => ({ key: k, confidence: v.confidence }));
            return (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <p className="text-slate-200 mb-3">{item.text}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {flags.map(({ key, confidence }) => (
                    <span key={key} className="bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded">
                      {formatLabel(key)} {(confidence * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Optional note..."
                  value={notes[item.id] || ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleReview(item.id)}
                  className="bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Mark Reviewed
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Admin;
