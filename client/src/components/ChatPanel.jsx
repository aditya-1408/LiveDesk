import { useEffect, useState } from "react";
import { api, downloadBlob } from "../api.js";

export default function ChatPanel({ socket, sessionId, token, role }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/sessions/${sessionId}/chat`, { token }).then(setMessages).catch(() => setMessages([]));
  }, [sessionId, token]);

  useEffect(() => {
    if (!socket) return undefined;
    const receive = (message) => setMessages((current) => [...current, message]);
    socket.on("chat:receive", receive);
    return () => socket.off("chat:receive", receive);
  }, [socket]);

  function send(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !socket) return;
    socket.emit("chat:send", { sessionId, message });
    setDraft("");
  }

  async function uploadFile(event) {
    event.preventDefault();
    if (!file || !socket) return;
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("message", draft.trim() || file.name);
      const result = await api(`/api/sessions/${sessionId}/chat/upload`, {
        method: "POST",
        token,
        body: form
      });
      socket.emit("chat:file-shared", { sessionId, message: result.message });
      setFile(null);
      setDraft("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <aside className="chat-panel">
      <h2>Chat</h2>
      {error && <div className="chat-error">{error}</div>}
      <div className="messages">
        {messages.map((message) => (
          <div className={`message ${message.sender_role === role ? "own" : ""}`} key={message.id || `${message.sent_at}-${message.message}`}>
            <span>{message.sender_role}</span>
            <p>{message.message}</p>
            {message.file_url && (
              <button className="file-link" onClick={() => downloadBlob(message.file_url, message.message || "shared-file", token)}>
                Download file
              </button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="chat-form">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" />
        <button>Send</button>
      </form>
      <form onSubmit={uploadFile} className="upload-form">
        <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <button disabled={!file}>Share file</button>
      </form>
    </aside>
  );
}
