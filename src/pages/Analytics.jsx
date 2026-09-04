import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchStats } from "../api";

function formatLabel(label) {
  return label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-20 text-center text-slate-500">Loading analytics...</div>;
  }

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center text-slate-500">
        Couldn't load analytics right now.
      </div>
    );
  }

  const categoryData = Object.entries(stats.label_counts)
    .filter(([k]) => k !== "not_cyberbullying")
    .map(([label, count]) => ({ label: formatLabel(label), count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-extrabold mb-8">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">{stats.total_moderated}</h3>
          <p className="text-slate-400 mt-2">Total Moderated</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold text-red-400">{stats.total_flagged}</h3>
          <p className="text-slate-400 mt-2">Total Flagged</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">{(stats.flagged_rate * 100).toFixed(1)}%</h3>
          <p className="text-slate-400 mt-2">Flag Rate</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Flags by Category</h2>
        {categoryData.length === 0 ? (
          <p className="text-slate-500 text-sm">No flagged content yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="label" type="category" stroke="#94a3b8" width={140} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Volume — Last 14 Days</h2>
        {stats.timeline.length === 0 ? (
          <p className="text-slate-500 text-sm">No activity yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Line type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="flagged" stroke="#f87171" strokeWidth={2} name="Flagged" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default Analytics;
