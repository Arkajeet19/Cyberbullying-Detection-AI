import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { fetchAdminQueue, reviewItem, fetchForumQueue, forumModAction } from "../api";

function formatLabel(label) {
  return label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ForumQueueTab({ adminKey }) {
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchForumQueue(adminKey)
      .then((data) => {
        setItems(data.items);
        setReports(data.reports);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(load, [adminKey]);

  const handleAction = async (contentType, contentId, action) => {
    try {
      await forumModAction(adminKey, contentType, contentId, action);
      setItems((prev) => prev.filter((i) => !(i.type === contentType && i.id === contentId)));
    } catch (err) {
      console.error(err);
      alert("Action failed.");
    }
  };

  if (loading) return <div className="text-center text-slate-500 py-10">Loading...</div>;

  return (
    <>
      {reports.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Pending Reports</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm">
                <span className="text-slate-400">
                  {r.target_type} #{r.target_id} reported by user #{r.reporter_id}
                </span>
                {r.reason && <p className="text-slate-300 mt-1">"{r.reason}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Flagged Content</h2>
      {items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
          Nothing pending — the queue is clear.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const flags = Object.entries(item.labels)
              .filter(([k, v]) => k !== "not_cyberbullying" && v.flagged === 1)
              .map(([k, v]) => ({ key: k, confidence: v.confidence }));
            return (
              <div key={`${item.type}-${item.id}`} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">
                    {item.type === "post" ? "Post" : "Comment"} by @{item.username}
                  </span>
                </div>
                <p className="text-slate-200 mb-3">{item.content}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {flags.map(({ key, confidence }) => (
                    <span key={key} className="bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded">
                      {formatLabel(key)} {(confidence * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction(item.type, item.id, "approve")}
                    className="bg-green-600/20 text-green-400 hover:bg-green-600/30 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(item.type, item.id, "remove")}
                    className="bg-red-600/20 text-red-400 hover:bg-red-600/30 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleAction(item.type, item.id, "warn")}
                    className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Warn User
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Ban @${item.username}? This is permanent.`)) {
                        handleAction(item.type, item.id, "ban");
                      }
                    }}
                    className="bg-slate-700 text-slate-300 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Ban User
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ClassifierQueueTab({ adminKey }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    fetchAdminQueue(adminKey)
      .then((data) => setQueue(data.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [adminKey]);

  const handleReview = async (id) => {
    try {
      await reviewItem(adminKey, id, notes[id] || "");
      setQueue((q) => q.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to submit review.");
    }
  };

  if (loading) return <div className="text-center text-slate-500 py-10">Loading...</div>;

  return queue.length === 0 ? (
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
  );
}

function Admin() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem("cg_admin_key") || "");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("forum");

  const tryUnlock = (key) => {
    setLoading(true);
    setError("");
    fetchForumQueue(key)
      .then(() => {
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
    if (adminKey) tryUnlock(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          onKeyDown={(e) => e.key === "Enter" && tryUnlock(adminKey)}
        />
        <button
          onClick={() => tryUnlock(adminKey)}
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
      <h1 className="text-4xl font-extrabold mb-6">Review Queue</h1>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab("forum")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "forum" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
        >
          Forum Content
        </button>
        <button
          onClick={() => setTab("classifier")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "classifier" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
        >
          Moderate Tool Log
        </button>
      </div>

      {tab === "forum" ? <ForumQueueTab adminKey={adminKey} /> : <ClassifierQueueTab adminKey={adminKey} />}
    </div>
  );
}

export default Admin;
