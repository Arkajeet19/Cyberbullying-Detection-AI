import { useState } from "react";
import axios from "axios";
import { ShieldAlert } from "lucide-react";

function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
      "https://cyberbullying-detection-ai.onrender.com/predict",
        {
          text,
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error(err);
      alert("Backend connection failed");
    } finally {
      setLoading(false);
    }
  };

  const detected = result
    ? Object.entries(result)
        .filter(([_, value]) => Number(value) === 1)
        .map(([key]) => key)
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="w-full max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">

          <div className="flex justify-center mb-4">
            <ShieldAlert
              size={80}
              className="text-blue-500 drop-shadow-lg"
            />
          </div>

          <h1 className="text-6xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Cyberbullying Detection AI
          </h1>

          <p className="text-slate-400 text-lg">
            Detect harmful online content using Machine Learning
          </p>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center">
            <h3 className="text-3xl font-bold">684K+</h3>
            <p className="text-slate-400 mt-2">
              Dataset Records
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center">
            <h3 className="text-3xl font-bold">13</h3>
            <p className="text-slate-400 mt-2">
              Categories
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center">
            <h3 className="text-3xl font-bold">
              Linear SVM
            </h3>
            <p className="text-slate-400 mt-2">
              ML Model
            </p>
          </div>

        </div>

        {/* Main Card */}
        <div className="bg-slate-900 rounded-2xl shadow-2xl p-8">

          <textarea
            className="w-full h-56 bg-slate-800 rounded-xl p-4 border border-slate-700 focus:outline-none focus:border-blue-500 text-lg resize-none"
            placeholder="Enter text to analyze..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            onClick={analyze}
          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all py-4 rounded-xl font-semibold text-lg shadow-lg"
          >
            {loading
              ? "Analyzing..."
              : "Analyze Text"}
          </button>

          {result && (
            <div className="mt-8">

              <h2 className="text-3xl font-bold mb-6">
                Analysis Results
              </h2>

              {detected.length > 0 ? (

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {detected.map((item) => (
                    <div
                      key={item}
                      className="bg-red-500/10 border border-red-500 rounded-xl p-5 hover:scale-105 transition-all"
                    >
                      <span className="text-red-400 font-semibold text-lg">
                        🚨 {item
                          .replaceAll("_", " ")
                          .replace(
                            /\b\w/g,
                            (c) => c.toUpperCase()
                          )}
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
              <div className="text-center text-slate-500 mt-8 pb-4 border-t border-slate-800 pt-6">
                Built with ❤️ using React, Flask, TF-IDF and Linear SVM
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default App;