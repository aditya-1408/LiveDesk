import { addMessage } from "../services/chatService.js";
import { canAccessSession } from "../services/accessService.js";
import { authenticateSocket } from "./authSocket.js";

export function registerChat(socket) {
  socket.on("chat:send", ({ sessionId, message }, cb) => {
    try {
      const user = authenticateSocket(socket);
      const access = canAccessSession(user, sessionId);
      if (!access.ok) return cb?.({ error: access.error });

      const cleanMessage = String(message || "").trim();
      if (!cleanMessage) return cb?.({ error: "Message cannot be empty" });
      const saved = addMessage(sessionId, user.role, cleanMessage);
      socket.to(sessionId).emit("chat:receive", saved);
      socket.emit("chat:receive", saved);
      cb?.({ ok: true, message: saved });
    } catch (error) {
      cb?.({ error: error.message });
    }
  });

  socket.on("chat:file-shared", ({ sessionId, message }, cb) => {
    try {
      const user = authenticateSocket(socket);
      const access = canAccessSession(user, sessionId);
      if (!access.ok) return cb?.({ error: access.error });
      socket.to(sessionId).emit("chat:receive", message);
      socket.emit("chat:receive", message);
      cb?.({ ok: true });
    } catch (error) {
      cb?.({ error: error.message });
    }
  });
}
