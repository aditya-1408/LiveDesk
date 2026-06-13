import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const roleCopy = {
  agent: {
    title: "Call Agent",
    description: "Create support sessions, invite customers, manage calls, and record sessions.",
    username: "agent",
    password: "agent123"
  },
  admin: {
    title: "Administrator",
    description: "Monitor live operations, inspect session history, and end active sessions.",
    username: "admin",
    password: "admin123"
  }
};

function destinationFor(role) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function StaffAuth({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState("agent");
  const [username, setUsername] = useState(roleCopy.agent.username);
  const [password, setPassword] = useState(roleCopy.agent.password);
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const { login, signup, logout, user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user?.role === "agent") return <Navigate to="/dashboard" replace />;
  if (user?.role === "customer") return <Navigate to="/ended" replace />;

  function selectRole(nextRole) {
    setRole(nextRole);
    setUsername(roleCopy[nextRole].username);
    setPassword(roleCopy[nextRole].password);
    setAdminCode("");
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const result =
        mode === "login"
          ? await login(username, password, role)
          : await signup(username, password, role, adminCode);
      if (result.user?.role !== role) {
        logout();
        throw new Error(`These credentials belong to ${result.user?.role || "another role"}. Use the correct ${result.user?.role || "role"} login.`);
      }
      navigate(destinationFor(role));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page staff-auth-page">
      <section className="staff-auth-shell">
        <aside className="staff-auth-brief">
          <p className="eyebrow">LiveDesk staff access</p>
          <h1>Secure workspace for support operations</h1>
          <p>Choose the exact staff role before signing in. Customer access is invite-only and never uses this portal.</p>
          <div className="role-summary">
            <strong>{roleCopy[role].title}</strong>
            <span>{roleCopy[role].description}</span>
          </div>
        </aside>
        <form className="panel auth-form staff-auth-form" onSubmit={submit}>
          <div className="segmented-control" aria-label="Authentication mode">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
          </div>
          <div className="role-choice" aria-label="Staff role">
            {Object.entries(roleCopy).map(([value, copy]) => (
              <button
                type="button"
                key={value}
                className={role === value ? "active" : ""}
                onClick={() => selectRole(value)}
              >
                <strong>{copy.title}</strong>
                <span>{value === "agent" ? "Session workspace" : "Operations dashboard"}</span>
              </button>
            ))}
          </div>
          <div>
            <h2>{mode === "login" ? `${roleCopy[role].title} login` : `Create ${roleCopy[role].title.toLowerCase()} account`}</h2>
            <p>{mode === "login" ? "Use credentials for the selected role only." : "Create a staff account with the selected role."}</p>
          </div>
          {error && <div className="status error">{error}</div>}
          <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {mode === "signup" && role === "admin" && (
            <label>Admin signup code<input value={adminCode} onChange={(event) => setAdminCode(event.target.value)} placeholder="Required for admin accounts" /></label>
          )}
          <button>{mode === "login" ? `Login as ${roleCopy[role].title}` : `Create ${roleCopy[role].title}`}</button>
        </form>
      </section>
    </main>
  );
}

export default function AgentLogin() {
  return <StaffAuth initialMode="login" />;
}
