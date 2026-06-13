export default function ConnectionStatus({ status, error, notice, callEnded }) {
  if (callEnded) return <div className="status ended">The session has ended.</div>;
  if (error) return <div className="status error">{error}</div>;
  if (notice) return <div className="status notice">{notice}</div>;
  return <div className={`status ${status}`}>{status === "connected" ? "Connected" : "Connecting..."}</div>;
}
