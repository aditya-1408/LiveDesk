const API_BASE = import.meta.env.VITE_API_BASE || "";

export function getStoredToken() {
  return localStorage.getItem("aq_token");
}

export function setStoredToken(token) {
  localStorage.setItem("aq_token", token);
}

export function clearStoredToken() {
  localStorage.removeItem("aq_token");
}

export async function api(path, options = {}) {
  const token = options.token ?? getStoredToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
