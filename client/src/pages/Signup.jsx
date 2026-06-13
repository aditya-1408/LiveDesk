import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await signup(username, password, role, adminCode);
      navigate(result.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="panel auth-form" onSubmit={submit}>
        <h1>Create account</h1>
        {error && <div className="status error">{error}</div>}
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {role === "admin" && (
          <label>Admin code<input value={adminCode} onChange={(event) => setAdminCode(event.target.value)} placeholder="admin123" /></label>
        )}
        <button>Create account</button>
        <Link to="/login">Already have an account?</Link>
      </form>
    </main>
  );
}
