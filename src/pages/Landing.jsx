import { Link } from "react-router-dom";
import { ShieldCheck, Gauge, History, LayoutDashboard, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Gauge,
    title: "Real-Time Moderation",
    desc: "Submit any text and get an instant multi-label classification across 13 categories of harmful content.",
  },
  {
    icon: History,
    title: "Full Audit History",
    desc: "Every moderation call is logged, timestamped, and searchable — nothing disappears after the request completes.",
  },
  {
    icon: LayoutDashboard,
    title: "Analytics Dashboard",
    desc: "Track flagged-content volume and category breakdowns over time to spot trends before they become problems.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-Loop Review",
    desc: "Flagged content lands in an admin queue for review and override — the model assists moderators, it doesn't replace them.",
  },
];

function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Hero */}
      <section className="text-center py-20">
        <div className="flex justify-center mb-6">
          <ShieldCheck size={72} className="text-blue-500 drop-shadow-lg" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          CyberGuard
        </h1>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto">
          An AI-powered content moderation platform that detects harmful text
          in real time, logs every decision, and gives moderators the tools
          to review and act on it.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/moderate"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all px-6 py-3 rounded-xl font-semibold shadow-lg"
          >
            Try it now <ArrowRight size={18} />
          </Link>
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 border border-slate-700 hover:bg-slate-800 transition-all px-6 py-3 rounded-xl font-semibold"
          >
            View analytics
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">684K+</h3>
          <p className="text-slate-400 mt-2">Training Records</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">13</h3>
          <p className="text-slate-400 mt-2">Moderation Categories</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">Linear SVM</h3>
          <p className="text-slate-400 mt-2">Word + Char TF-IDF</p>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-600/50 transition-colors"
          >
            <Icon className="text-blue-500 mb-3" size={28} />
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Landing;
