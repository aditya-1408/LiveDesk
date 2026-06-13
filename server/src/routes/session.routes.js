import express from "express";
import { requireAgent, requireAuth } from "../auth/authMiddleware.js";
import { db } from "../db/database.js";
import { signCustomer } from "../auth/jwt.js";
import { listMessages } from "../services/chatService.js";
import {
  createSession,
  endSession,
  getSession,
  getSessionByToken,
  getSessionDetail,
  getSessionForAgent,
  listSessions
} from "../services/sessionService.js";

export const sessionRouter = express.Router();

sessionRouter.post("/sessions", requireAgent, (req, res) => {
  const session = createSession(req.user.agentId);
  res.status(201).json(session);
});

sessionRouter.get("/sessions", requireAgent, (req, res) => {
  res.json(listSessions(req.user.agentId));
});

sessionRouter.get("/sessions/:id", requireAuth, (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (req.user.role === "agent" && session.agent_id !== req.user.agentId) {
    return res.status(403).json({ error: "Cannot view another agent's session" });
  }
  if (req.user.role === "customer" && session.id !== req.user.sessionId) {
    return res.status(403).json({ error: "Cannot view another session" });
  }
  res.json(getSessionDetail(req.params.id));
});

sessionRouter.get("/sessions/:id/chat", requireAuth, (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (req.user.role === "customer" && req.user.sessionId !== req.params.id) {
    return res.status(403).json({ error: "Cannot read another session chat" });
  }
  if (req.user.role === "agent" && session.agent_id !== req.user.agentId) {
    return res.status(403).json({ error: "Cannot read another agent's chat" });
  }
  res.json(listMessages(req.params.id));
});

sessionRouter.get("/invite/:token", (req, res) => {
  const session = getSessionByToken(req.params.token);
  if (!session) return res.status(404).json({ error: "Invalid invite link" });
  if (session.status === "ended") {
    const endedEvent = db
      .prepare("SELECT role FROM session_events WHERE session_id = ? AND event_type = 'ended' ORDER BY id DESC LIMIT 1")
      .get(session.id);
    const timeoutExpired = endedEvent?.role === "system";
    return res.status(410).json({
      error: timeoutExpired
        ? "The 5-minute reconnect window for this session has expired. Please ask the agent to create a new call."
        : "This session has ended. Please ask the agent to create a new call."
    });
  }

  res.json({
    token: signCustomer(session.id),
    role: "customer",
    sessionId: session.id,
    status: session.status
  });
});

sessionRouter.post("/sessions/:id/end", requireAgent, (req, res) => {
  const session = getSessionForAgent(req.params.id, req.user.agentId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  endSession(req.params.id, "agent");
  req.app.get("io")?.to(req.params.id).emit("call-ended", { by: "agent" });
  setTimeout(() => req.app.get("io")?.in(req.params.id).disconnectSockets(true), 250);
  res.json({ ok: true });
});
