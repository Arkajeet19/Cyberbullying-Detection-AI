import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 text-sm transition-colors border-b-2 ${
    isActive
      ? "border-signal text-paper"
      : "border-transparent text-paper-dim hover:text-paper"
  }`;

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-panel-line bg-ink/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 1L18 4V9C18 13.5 14.5 17.5 10 19C5.5 17.5 2 13.5 2 9V4L10 1Z"
              stroke="currentColor" strokeWidth="1.4" className="text-signal" />
            <circle cx="10" cy="9.5" r="2.2" fill="currentColor" className="text-signal" />
          </svg>
          <span className="font-display text-lg tracking-tight">CyberGuard</span>
        </NavLink>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/moderate" className={linkClass}>Moderate</NavLink>
          <NavLink to="/forum" className={linkClass}>Forum</NavLink>
          <NavLink to="/history" className={linkClass}>History</NavLink>
          <NavLink to="/analytics" className={linkClass}>Analytics</NavLink>
          <NavLink to="/admin" className={linkClass}>Admin</NavLink>

          {user ? (
            <div className="flex items-center gap-3 ml-3 pl-3 border-l border-panel-line">
              <span className="cg-mono text-xs text-paper-dim">@{user.username}</span>
              <button
                onClick={logout}
                className="text-paper-dim hover:text-signal transition-colors"
                title="Log out"
              >
                <LogOut size={15} />
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
