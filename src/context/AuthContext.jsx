import { createContext, useContext, useState, useEffect } from "react";
import { fetchMe, loginRequest, registerRequest, logoutRequest } from "../api";

const AuthContext = createContext(null);
const TOKEN_KEY = "cg_auth_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem(TOKEN_KEY); // token expired/invalid
        }
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const data = await loginRequest(username, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data);
    return data;
  };

  const register = async (username, password) => {
    const data = await registerRequest(username, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    await logoutRequest();
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}