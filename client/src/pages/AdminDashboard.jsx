import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function AdminDashboard() {
  const [live, setLive] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  async function load() {
    const [liveRows, historyRows] = await Promise.all([
      api("/api/admin/sessions/live"),
      api("/api/admin/sessions/history")
    ]);
    setLive(liveRows);
    setHistory(historyRows);
  }

  async function endSession(sessionId) {
    await api(`/api/admin/sessions/${sessionId}/end`, { method: "POST" });
    await load();
    if (selected?.id === sessionId) await inspectSession(sessionId);
  }

  async function inspectSession(sessionId) {
    setSelected(await api(`/api/admin/sessions/${sessionId}`));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Live sessions refresh every five seconds.</p>
        </div>
        <Link to="/dashboard">Agent dashboard</Link>
      </header>
      <section className="panel">
        <h2>Live sessions</h2>
        <table>
          <thead><tr><th>Session</th><th>Status</th><th>Connected</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {live.map((session) => (
              <tr key={session.id}>
                <td>{session.id}</td>
                <td>{session.status}</td>
                <td>{session.connected_participants}</td>
                <td>{session.created_at}</td>
                <td className="row-actions">
                  <button onClick={() => inspectSession(session.id)}>Inspect</button>
                  <button className="danger" onClick={() => endSession(session.id)}>End</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h2>Recent history</h2>
        <table>
          <thead><tr><th>Session</th><th>Status</th><th>Participants</th><th>Chat</th><th>Recording</th><th>Created</th><th>Ended</th><th></th></tr></thead>
          <tbody>
            {history.map((session) => (
              <tr key={session.id}>
                <td>{session.id}</td>
                <td>{session.status}</td>
                <td>{session.participant_count}</td>
                <td>{session.chat_count}</td>
                <td>{session.recording_status || "idle"}</td>
                <td>{session.created_at}</td>
                <td>{session.ended_at || "-"}</td>
                <td><button onClick={() => inspectSession(session.id)}>Inspect</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected && (
        <section className="panel admin-detail">
          <div className="detail-header">
            <div>
              <h2>Session detail</h2>
              <p>{selected.id} · {selected.status}</p>
            </div>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="detail-grid">
            <div>
              <h3>Participants</h3>
              <table>
                <thead><tr><th>Role</th><th>Joined</th><th>Left</th><th>Duration</th></tr></thead>
                <tbody>
                  {selected.participants.map((participant) => (
                    <tr key={participant.id}>
                      <td>{participant.role}</td>
                      <td>{participant.joined_at}</td>
                      <td>{participant.left_at || "connected"}</td>
                      <td>{participant.duration_seconds ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3>Events</h3>
              <div className="event-list">
                {selected.events.map((event) => (
                  <div key={event.id} className="event-item">
                    <strong>{event.event_type}</strong>
                    <span>{event.role || "system"} · {event.created_at}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <h3>Chat record</h3>
          <div className="event-list">
            {selected.messages.map((message) => (
              <div key={message.id} className="event-item">
                <strong>{message.sender_role}</strong>
                <span>{message.message}{message.file_url ? " · file attached" : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
