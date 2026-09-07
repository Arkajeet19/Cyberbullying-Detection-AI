import { useEffect, useState } from "react";
import { fetchAdminQueue, reviewItem, fetchForumQueue, forumModAction, fetchChatQueue, chatModAction, fetchBehaviorList } from "../api";

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

  if (loading) return <div className="text-center text-paper-dim py-10 text-sm">Loading...</div>;

  return (
    <>
      {reports.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm cg-mono text-paper-dim mb-3">pending reports</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="cg-panel p-4 text-sm">
                <span className="text-paper-dim cg-mono text-xs">
                  {r.target_type} #{r.target_id} — reported by user #{r.reporter_id}
                </span>
                {r.reason && <p className="text-paper mt-1">"{r.reason}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm cg-mono text-paper-dim mb-3">flagged content</h2>
      {items.length === 0 ? (
        <div className="cg-panel p-10 text-center text-paper-dim text-sm">
          Nothing pending — the queue is clear.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const flags = Object.entries(item.labels)
              .filter(([k, v]) => k !== "not_cyberbullying" && v.flagged === 1)
              .map(([k, v]) => ({ key: k, confidence: v.confidence }));
            return (
              <div key={`${item.type}-${item.id}`} className="cg-panel p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-paper-dim cg-mono">
                    {item.type} by @{item.username}
                  </span>
                </div>
                <p className="text-paper mb-3 text-sm">{item.content}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {flags.map(({ key, confidence }) => (
                    <span key={key} className="cg-badge cg-badge-signal">
                      {formatLabel(key)} {(confidence * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction(item.type, item.id, "approve")}
                    className="cg-btn cg-btn-clear px-3 py-1.5 text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(item.type, item.id, "remove")}
                    className="cg-btn cg-btn-alarm px-3 py-1.5 text-xs"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleAction(item.type, item.id, "warn")}
                    className="cg-btn cg-btn-quiet px-3 py-1.5 text-xs"
                  >
                    Warn user
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Ban @${item.username}? This is permanent.`)) {
                        handleAction(item.type, item.id, "ban");
                      }
                    }}
                    className="cg-btn cg-btn-quiet px-3 py-1.5 text-xs"
                  >
                    Ban user
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

function ChatQueueTab({ adminKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchChatQueue(adminKey)
      .then((data) => setItems(data.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(load, [adminKey]);

  const handleAction = async (id, action) => {
    try {
      await chatModAction(adminKey, id, action);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
      alert("Action failed.");
    }
  };

  if (loading) return <div className="text-center text-paper-dim py-10 text-sm">Loading...</div>;

  return items.length === 0 ? (
    <div className="cg-panel p-10 text-center text-paper-dim text-sm">
      Nothing pending — the queue is clear.
    </div>
  ) : (
    <div className="space-y-4">
      {items.map((item) => {
        const flags = Object.entries(item.labels)
          .filter(([k, v]) => k !== "not_cyberbullying" && v.flagged === 1)
          .map(([k, v]) => ({ key: k, confidence: v.confidence }));
        return (
          <div key={item.id} className="cg-panel p-5">
            <div className="text-xs text-paper-dim cg-mono mb-2">chat message by @{item.username}</div>
            <p className="text-paper mb-3 text-sm">{item.content}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {flags.map(({ key, confidence }) => (
                <span key={key} className="cg-badge cg-badge-signal">
                  {formatLabel(key)} {(confidence * 100).toFixed(0)}%
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAction(item.id, "approve")} className="cg-btn cg-btn-clear px-3 py-1.5 text-xs">
                Approve
              </button>
              <button onClick={() => handleAction(item.id, "remove")} className="cg-btn cg-btn-alarm px-3 py-1.5 text-xs">
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BehaviorTab({ adminKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchBehaviorList(adminKey)
      .then((data) => setItems(data.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [adminKey]);

  if (loading) return <div className="text-center text-paper-dim py-10 text-sm">Loading...</div>;

  const tierColor = { high: "cg-badge-alarm", medium: "cg-badge-signal", low: "cg-badge-clear" };

  return items.length === 0 ? (
    <div className="cg-panel p-10 text-center text-paper-dim text-sm">
      No users with flagged content yet.
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-paper-dim text-xs cg-mono mb-4">
        Looks across each user's history for repeated, targeted patterns — not just single messages.
      </p>
      {items.map((item) => (
        <div key={item.user_id} className="cg-panel p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="cg-mono text-sm">@{item.username}</span>
            <div className="flex items-center gap-3">
              <span className="cg-mono text-xs text-paper-dim">score {item.risk_score}/100</span>
              <span className={`cg-badge ${tierColor[item.risk_tier]}`}>{item.risk_tier}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-paper-dim mb-2">
            <span>{item.flagged_count}/{item.total_content} flagged</span>
            <span>{item.recent_flagged} in last 7 days</span>
            <span>{item.targets.length} target{item.targets.length !== 1 ? "s" : ""}</span>
          </div>
          {item.targets.length > 0 && (
            <button
              onClick={() => setExpanded(expanded === item.user_id ? null : item.user_id)}
              className="text-xs text-signal hover:underline cg-mono"
            >
              {expanded === item.user_id ? "hide targets" : "show targets"}
            </button>
          )}
          {expanded === item.user_id && (
            <div className="mt-2 space-y-1">
              {item.targets.map((t) => (
                <div key={t.username} className="text-xs text-paper-dim flex justify-between border-t border-panel-line pt-1.5 mt-1.5">
                  <span>@{t.username}</span>
                  <span className="cg-mono">{t.count} flagged comment{t.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
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

  if (loading) return <div className="text-center text-paper-dim py-10 text-sm">Loading...</div>;

  return queue.length === 0 ? (
    <div className="cg-panel p-10 text-center text-paper-dim text-sm">
      Nothing pending — the queue is clear.
    </div>
  ) : (
    <div className="space-y-4">
      {queue.map((item) => {
        const flags = Object.entries(item.labels)
          .filter(([k, v]) => k !== "not_cyberbullying" && v.flagged === 1)
          .map(([k, v]) => ({ key: k, confidence: v.confidence }));
        return (
          <div key={item.id} className="cg-panel p-5">
            <p className="text-paper mb-3 text-sm">{item.text}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {flags.map(({ key, confidence }) => (
                <span key={key} className="cg-badge cg-badge-signal">
                  {formatLabel(key)} {(confidence * 100).toFixed(0)}%
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Optional note..."
              value={notes[item.id] || ""}
              onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
              className="cg-input w-full px-3 py-2 mb-3 text-sm"
            />
            <button
              onClick={() => handleReview(item.id)}
              className="cg-btn cg-btn-signal px-4 py-2 text-sm"
            >
              Mark reviewed
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
      <div className="max-w-sm mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-8">Admin access</h1>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Admin key"
          className="cg-input w-full px-4 py-3 mb-4 text-sm"
          onKeyDown={(e) => e.key === "Enter" && tryUnlock(adminKey)}
        />
        <button
          onClick={() => tryUnlock(adminKey)}
          disabled={loading || !adminKey}
          className="cg-btn cg-btn-signal w-full py-3 text-sm"
        >
          {loading ? "Checking..." : "Unlock"}
        </button>
        {error && <p className="text-alarm text-sm mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-6">Review queue</h1>

      <div className="flex gap-1 mb-8 border-b border-panel-line">
        <button
          onClick={() => setTab("forum")}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === "forum" ? "border-signal text-paper" : "border-transparent text-paper-dim hover:text-paper"
          }`}
        >
          Forum content
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === "chat" ? "border-signal text-paper" : "border-transparent text-paper-dim hover:text-paper"
          }`}
        >
          Chat messages
        </button>
        <button
          onClick={() => setTab("behavior")}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === "behavior" ? "border-signal text-paper" : "border-transparent text-paper-dim hover:text-paper"
          }`}
        >
          User behavior
        </button>
        <button
          onClick={() => setTab("classifier")}
          className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === "classifier" ? "border-signal text-paper" : "border-transparent text-paper-dim hover:text-paper"
          }`}
        >
          Moderate tool log
        </button>
      </div>

      {tab === "forum" ? (
        <ForumQueueTab adminKey={adminKey} />
      ) : tab === "chat" ? (
        <ChatQueueTab adminKey={adminKey} />
      ) : tab === "behavior" ? (
        <BehaviorTab adminKey={adminKey} />
      ) : (
        <ClassifierQueueTab adminKey={adminKey} />
      )}
    </div>
  );
}

export default Admin;
