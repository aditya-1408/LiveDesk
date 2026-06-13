import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, setStoredToken } from "../api.js";

export default function JoinSession() {
  const { token: inviteToken } = useParams();
  const [state, setState] = useState({ loading: true, error: "", session: null });
  const navigate = useNavigate();

  useEffect(() => {
    api(`/api/invite/${inviteToken}`, { token: null })
      .then((session) => {
        setStoredToken(session.token);
        setState({ loading: false, error: "", session });
      })
      .catch((err) => setState({ loading: false, error: err.message, session: null }));
  }, [inviteToken]);

  if (state.loading) return <main className="auth-page"><div className="panel">Validating invite...</div></main>;
  if (state.error) return <main className="auth-page"><div className="panel status error">{state.error}</div></main>;

  return (
    <main className="auth-page">
      <section className="panel auth-form">
        <h1>Join support call</h1>
        <p>Your browser will ask for camera and microphone access.</p>
        <button onClick={() => navigate(`/room/${state.session.sessionId}`, { state: { role: "customer", token: state.session.token } })}>
          Join call
        </button>
      </section>
    </main>
  );
}
