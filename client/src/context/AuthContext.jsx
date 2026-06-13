import { createContext, useContext, useMemo, useState } from "react";
import { api, clearStoredToken, getStoredToken, setStoredToken } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [agent, setAgent] = useState(null);

  async function login(username, password) {
    const result = await api("/api/auth/login", {
      method: "POST",
      token: null,
      body: JSON.stringify({ username, password })
    });
    setStoredToken(result.token);
    setToken(result.token);
    setAgent(result.agent);
    return result;
  }

  function logout() {
    clearStoredToken();
    setToken(null);
    setAgent(null);
  }

  const value = useMemo(() => ({ token, agent, login, logout, isAgent: Boolean(token) }), [token, agent]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
