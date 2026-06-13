import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function ChatPanel({ socket, sessionId, token, role }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

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

  return (
    <aside className="chat-panel">
      <h2>Chat</h2>
      <div className="messages">
        {messages.map((message) => (
          <div className={`message ${message.sender_role === role ? "own" : ""}`} key={message.id || `${message.sent_at}-${message.message}`}>
            <span>{message.sender_role}</span>
            <p>{message.message}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="chat-form">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" />
        <button>Send</button>
      </form>
    </aside>
  );
}
