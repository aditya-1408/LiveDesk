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

export function decodeToken(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const token = options.token ?? getStoredToken();
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function downloadBlob(path, filename, token = getStoredToken()) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
