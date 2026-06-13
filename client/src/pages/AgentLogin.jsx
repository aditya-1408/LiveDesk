import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AgentLogin() {
  const [username, setUsername] = useState("agent");
  const [password, setPassword] = useState("agent123");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await login(username, password);
      navigate(result.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="panel auth-form" onSubmit={submit}>
        <h1>Agent Login</h1>
        {error && <div className="status error">{error}</div>}
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button>Sign in</button>
        <Link to="/signup">Create agent/admin account</Link>
      </form>
    </main>
  );
}
