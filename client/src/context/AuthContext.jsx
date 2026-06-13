import { createContext, useContext, useMemo, useState } from "react";
import { api, clearStoredToken, decodeToken, getStoredToken, setStoredToken } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(() => decodeToken(getStoredToken()));

  async function login(username, password, role) {
    const result = await api("/api/auth/login", {
      method: "POST",
      token: null,
      body: JSON.stringify({ username, password, role })
    });
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user || result.agent);
    return result;
  }

  async function signup(username, password, role, adminCode) {
    const result = await api("/api/auth/signup", {
      method: "POST",
      token: null,
      body: JSON.stringify({ username, password, role, adminCode })
    });
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user || result.agent);
    return result;
  }

  function logout() {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      agent: user,
      login,
      signup,
      logout,
      isAgent: ["agent", "admin"].includes(user?.role),
      isAdmin: user?.role === "admin"
    }),
    [token, user]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
