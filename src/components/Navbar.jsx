import { NavLink } from "react-router-dom";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-blue-600 text-white"
      : "text-slate-300 hover:text-white hover:bg-slate-800"
  }`;

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2">
          <ShieldCheck className="text-blue-500" size={26} />
          <span className="text-xl font-bold text-white">CyberGuard</span>
        </NavLink>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/moderate" className={linkClass}>Moderate</NavLink>
          <NavLink to="/forum" className={linkClass}>Forum</NavLink>
          <NavLink to="/history" className={linkClass}>History</NavLink>
          <NavLink to="/analytics" className={linkClass}>Analytics</NavLink>
          <NavLink to="/admin" className={linkClass}>Admin</NavLink>

          {user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800">
              <span className="text-sm text-slate-400">@{user.username}</span>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={linkClass}>Log In</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
