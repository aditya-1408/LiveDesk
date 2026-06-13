import { Link } from "react-router-dom";

export default function CallEnded() {
  return (
    <main className="auth-page">
      <section className="panel auth-form">
        <h1>Session ended</h1>
        <p>The support call has ended and all media connections were closed.</p>
        <Link to="/login">Agent login</Link>
      </section>
    </main>
  );
}
