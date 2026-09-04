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
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-extrabold mb-2">Moderation History</h1>
      <p className="text-slate-400 mb-8">{total} total submissions logged</p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No submissions yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="px-4 py-3">Text</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Reviewed</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const flags = Object.entries(item.labels)
                  .filter(([k, v]) => k !== "not_cyberbullying" && v.flagged === 1)
                  .map(([k, v]) => ({ key: k, confidence: v.confidence }));
                return (
                  <tr key={item.id} className="border-t border-slate-800">
                    <td className="px-4 py-3 max-w-md truncate text-slate-200">
                      {item.text}
                    </td>
                    <td className="px-4 py-3">
                      {flags.length === 0 ? (
                        <span className="text-green-400 text-xs">Clean</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {flags.map(({ key, confidence }) => (
                            <span
                              key={key}
                              className="bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded"
                            >
                              {formatLabel(key)} {(confidence * 100).toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.reviewed ? "Yes" : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
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
          className="px-4 py-2 rounded-lg border border-slate-700 disabled:opacity-40 hover:bg-slate-800"
        >
          Previous
        </button>
        <span className="text-slate-400 text-sm">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-4 py-2 rounded-lg border border-slate-700 disabled:opacity-40 hover:bg-slate-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default History;
