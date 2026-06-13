import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function AdminDashboard() {
  const [live, setLive] = useState([]);
  const [history, setHistory] = useState([]);

  async function load() {
    const [liveRows, historyRows] = await Promise.all([
      api("/api/admin/sessions/live"),
      api("/api/admin/sessions/history")
    ]);
    setLive(liveRows);
    setHistory(historyRows);
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
          <thead><tr><th>Session</th><th>Status</th><th>Connected</th><th>Created</th></tr></thead>
          <tbody>{live.map((session) => <tr key={session.id}><td>{session.id}</td><td>{session.status}</td><td>{session.connected_participants}</td><td>{session.created_at}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel">
        <h2>Recent history</h2>
        <table>
          <thead><tr><th>Session</th><th>Status</th><th>Created</th><th>Ended</th></tr></thead>
          <tbody>{history.map((session) => <tr key={session.id}><td>{session.id}</td><td>{session.status}</td><td>{session.created_at}</td><td>{session.ended_at || "-"}</td></tr>)}</tbody>
        </table>
      </section>
    </main>
  );
}
