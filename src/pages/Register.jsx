import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, password);
      navigate("/forum");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-6 py-24">
      <h1 className="font-display text-3xl mb-8 text-center">Create account</h1>

      <form onSubmit={handleSubmit} className="cg-panel p-6 space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="cg-input w-full px-4 py-3 text-sm"
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="cg-input w-full px-4 py-3 text-sm"
        />
        {error && <p className="text-alarm text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="cg-btn cg-btn-signal w-full py-3 text-sm"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-paper-dim text-sm mt-4">
        Already have an account? <Link to="/login" className="text-signal hover:underline">Log in</Link>
      </p>
    </div>
  );
}

export default Register;
