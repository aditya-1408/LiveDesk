import express from "express";
import { requireAgent, requireAuth } from "../auth/authMiddleware.js";
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
  if (session.status === "ended") return res.status(410).json({ error: "This session has ended" });

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
