import { getSession } from "./sessionService.js";

export function canAccessSession(user, sessionId) {
  const session = getSession(sessionId);
  if (!session) return { ok: false, status: 404, error: "Session not found" };
  if (user.role === "agent" && session.agent_id !== user.agentId) {
    return { ok: false, status: 403, error: "Cannot access another agent's session" };
  }
  if (user.role === "customer" && user.sessionId !== sessionId) {
    return { ok: false, status: 403, error: "Cannot access another session" };
  }
  return { ok: true, session };
}
