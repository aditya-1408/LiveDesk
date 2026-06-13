export default function ConnectionStatus({ status, error, callEnded }) {
  if (callEnded) return <div className="status ended">The session has ended.</div>;
  if (error) return <div className="status error">{error}</div>;
  return <div className={`status ${status}`}>{status === "connected" ? "Connected" : "Connecting..."}</div>;
}
