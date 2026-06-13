import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AgentDashboard() {
  const [sessions, setSessions] = useState([]);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const { logout, token } = useAuth();
  const navigate = useNavigate();

  async function loadSessions() {
    setSessions(await api("/api/sessions"));
  }

  useEffect(() => {
    loadSessions().catch((err) => setError(err.message));
  }, []);

  async function createSession() {
    setError("");
    try {
      const result = await api("/api/sessions", { method: "POST" });
      const inviteLink = `${window.location.origin}${result.inviteLink}`;
      setInvite({ ...result, inviteLink });
      await loadSessions();
    } catch (err) {
      setError(err.message);
    }
  }

  function enterRoom(sessionId) {
    navigate(`/room/${sessionId}`, { state: { role: "agent", token } });
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Video Support Desk</h1>
          <p>Agent workspace for live browser support sessions.</p>
        </div>
        <nav>
          <Link to="/admin">Admin</Link>
          <button onClick={logout}>Logout</button>
        </nav>
      </header>
      {error && <div className="status error">{error}</div>}
      <section className="toolbar">
        <button onClick={createSession}>New session</button>
        {invite && (
          <div className="invite-box">
            <input readOnly value={invite.inviteLink} />
            <button onClick={() => navigator.clipboard.writeText(invite.inviteLink)}>Copy</button>
            <button onClick={() => enterRoom(invite.sessionId)}>Join as agent</button>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Session history</h2>
        <table>
          <thead><tr><th>Created</th><th>Status</th><th>Participants</th><th>Recording</th><th></th></tr></thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{new Date(session.created_at).toLocaleString()}</td>
                <td>{session.status}</td>
                <td>{session.participant_count}</td>
                <td>{session.recording_status || "idle"}</td>
                <td><button onClick={() => enterRoom(session.id)} disabled={session.status === "ended"}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
