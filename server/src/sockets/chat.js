import { addMessage } from "../services/chatService.js";

export function registerChat(socket) {
  socket.on("chat:send", ({ sessionId, message }, cb) => {
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return cb?.({ error: "Message cannot be empty" });
    const role = socket.handshake.auth?.role || "participant";
    const saved = addMessage(sessionId, role, cleanMessage);
    socket.to(sessionId).emit("chat:receive", saved);
    socket.emit("chat:receive", saved);
    cb?.({ ok: true, message: saved });
  });
}
