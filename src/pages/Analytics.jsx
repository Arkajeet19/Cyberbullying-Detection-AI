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

const INK = "#10161a";
const PANEL_LINE = "#232d33";
const PAPER_DIM = "#9ca6a8";
const PAPER = "#e8e3d7";
const SIGNAL = "#d99a4e";
const ALARM = "#b4573f";

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
    return <div className="max-w-5xl mx-auto px-6 py-20 text-center text-paper-dim">Loading analytics...</div>;
  }

  if (!stats) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center text-paper-dim">
        Couldn't load analytics right now.
      </div>
    );
  }

  const categoryData = Object.entries(stats.label_counts)
    .filter(([k]) => k !== "not_cyberbullying")
    .map(([label, count]) => ({ label: formatLabel(label), count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-8">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-panel-line border-y border-panel-line mb-10">
        <div className="text-center py-5">
          <div className="font-display text-3xl mb-1">{stats.total_moderated}</div>
          <div className="text-paper-dim text-sm cg-mono">total moderated</div>
        </div>
        <div className="text-center py-5">
          <div className="font-display text-3xl mb-1" style={{ color: SIGNAL }}>{stats.total_flagged}</div>
          <div className="text-paper-dim text-sm cg-mono">total flagged</div>
        </div>
        <div className="text-center py-5">
          <div className="font-display text-3xl mb-1">{(stats.flagged_rate * 100).toFixed(1)}%</div>
          <div className="text-paper-dim text-sm cg-mono">flag rate</div>
        </div>
      </div>

      <div className="cg-panel p-6 mb-6">
        <h2 className="text-sm cg-mono text-paper-dim mb-4">flags by category</h2>
        {categoryData.length === 0 ? (
          <p className="text-paper-dim text-sm">No flagged content yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={PANEL_LINE} horizontal={false} />
              <XAxis type="number" stroke={PAPER_DIM} fontSize={12} />
              <YAxis dataKey="label" type="category" stroke={PAPER_DIM} width={140} fontSize={12} />
              <Tooltip
                contentStyle={{ background: INK, border: `1px solid ${PANEL_LINE}`, borderRadius: 6 }}
                labelStyle={{ color: PAPER }}
                cursor={{ fill: "rgba(217,154,78,0.06)" }}
              />
              <Bar dataKey="count" fill={SIGNAL} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="cg-panel p-6">
        <h2 className="text-sm cg-mono text-paper-dim mb-4">volume — last 14 days</h2>
        {stats.timeline.length === 0 ? (
          <p className="text-paper-dim text-sm">No activity yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={PANEL_LINE} />
              <XAxis dataKey="day" stroke={PAPER_DIM} fontSize={12} />
              <YAxis stroke={PAPER_DIM} fontSize={12} />
              <Tooltip
                contentStyle={{ background: INK, border: `1px solid ${PANEL_LINE}`, borderRadius: 6 }}
                labelStyle={{ color: PAPER }}
              />
              <Line type="monotone" dataKey="total" stroke={PAPER_DIM} strokeWidth={2} name="Total" dot={false} />
              <Line type="monotone" dataKey="flagged" stroke={ALARM} strokeWidth={2} name="Flagged" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default Analytics;
