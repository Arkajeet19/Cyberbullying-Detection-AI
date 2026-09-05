import { useEffect, useState } from "react";
import { fetchHistory } from "../api";

function formatLabel(label) {
  return label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function History() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 15;

  useEffect(() => {
    setLoading(true);
    fetchHistory(page, perPage)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">Moderation history</h1>
      <p className="text-paper-dim cg-mono text-sm mb-8">{total} submissions logged</p>

      <div className="cg-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-paper-dim text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-paper-dim text-sm">No submissions yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-panel-line">
              <tr className="cg-mono text-xs text-paper-dim">
                <th className="px-4 py-3 font-normal">Text</th>
                <th className="px-4 py-3 font-normal">Flags</th>
                <th className="px-4 py-3 font-normal">Reviewed</th>
                <th className="px-4 py-3 font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const flags = Object.entries(item.labels)
                  .filter(([k, v]) => k !== "not_cyberbullying" && v.flagged === 1)
                  .map(([k, v]) => ({ key: k, confidence: v.confidence }));
                return (
                  <tr key={item.id} className="border-t border-panel-line">
                    <td className="px-4 py-3 max-w-md truncate text-paper">
                      {item.text}
                    </td>
                    <td className="px-4 py-3">
                      {flags.length === 0 ? (
                        <span className="text-clear text-xs cg-mono">clean</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {flags.map(({ key, confidence }) => (
                            <span key={key} className="cg-badge cg-badge-signal">
                              {formatLabel(key)} {(confidence * 100).toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-paper-dim cg-mono text-xs">
                      {item.reviewed ? "yes" : "—"}
                    </td>
                    <td className="px-4 py-3 text-paper-dim cg-mono text-xs whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="cg-btn cg-btn-quiet px-4 py-2 text-xs"
        >
          Previous
        </button>
        <span className="text-paper-dim text-xs cg-mono">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="cg-btn cg-btn-quiet px-4 py-2 text-xs"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default History;
