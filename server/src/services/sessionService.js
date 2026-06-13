import { v4 as uuidv4 } from "uuid";
import { db } from "../db/database.js";
import { generateInviteToken } from "./inviteService.js";

export function logEvent(sessionId, eventType, role = null, metadata = {}) {
  db.prepare(
    "INSERT INTO session_events (session_id, event_type, role, metadata) VALUES (?, ?, ?, ?)"
  ).run(sessionId, eventType, role, JSON.stringify(metadata));
}

export function createSession(agentId) {
  const sessionId = uuidv4();
  const inviteToken = generateInviteToken();
  db.prepare("INSERT INTO sessions (id, agent_id, invite_token, status) VALUES (?, ?, ?, 'created')").run(
    sessionId,
    agentId,
    inviteToken
  );
  db.prepare("INSERT INTO recordings (session_id, status) VALUES (?, 'idle')").run(sessionId);
  logEvent(sessionId, "created", "agent", { agentId });
  return { sessionId, inviteToken, inviteLink: `/join/${inviteToken}` };
}

export function getSessionByToken(token) {
  return db.prepare("SELECT * FROM sessions WHERE invite_token = ?").get(token);
}

export function getSession(sessionId) {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
}

export function getSessionForAgent(sessionId, agentId) {
  return db.prepare("SELECT * FROM sessions WHERE id = ? AND agent_id = ?").get(sessionId, agentId);
}

export function markSessionActive(sessionId) {
  db.prepare("UPDATE sessions SET status = 'active' WHERE id = ? AND status = 'created'").run(sessionId);
}

export function endSession(sessionId, role = "agent") {
  db.prepare("UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
  db.prepare(
    "UPDATE participants SET left_at = COALESCE(left_at, CURRENT_TIMESTAMP), duration_seconds = CAST((julianday(COALESCE(left_at, CURRENT_TIMESTAMP)) - julianday(joined_at)) * 86400 AS INTEGER) WHERE session_id = ? AND left_at IS NULL"
  ).run(sessionId);
  logEvent(sessionId, "ended", role);
}

export function listSessions(agentId) {
  return db
    .prepare(
      `SELECT s.*,
        (SELECT COUNT(*) FROM participants p WHERE p.session_id = s.id) AS participant_count,
        (SELECT status FROM recordings r WHERE r.session_id = s.id ORDER BY id DESC LIMIT 1) AS recording_status
       FROM sessions s
       WHERE s.agent_id = ?
       ORDER BY s.created_at DESC`
    )
    .all(agentId);
}

export function getSessionDetail(sessionId) {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  const participants = db.prepare("SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at").all(sessionId);
  const messages = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY sent_at").all(sessionId);
  const events = db.prepare("SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at").all(sessionId);
  const recording = db.prepare("SELECT * FROM recordings WHERE session_id = ? ORDER BY id DESC LIMIT 1").get(sessionId);
  return { ...session, participants, messages, events, recording };
}

export function addParticipant(sessionId, role, clientId, socketId) {
  const result = db
    .prepare("INSERT INTO participants (session_id, role, client_id, socket_id) VALUES (?, ?, ?, ?)")
    .run(sessionId, role, clientId, socketId);
  logEvent(sessionId, "joined", role, { clientId, socketId });
  return result.lastInsertRowid;
}

export function updateParticipantSocket(participantId, socketId) {
  db.prepare("UPDATE participants SET socket_id = ?, left_at = NULL WHERE id = ?").run(socketId, participantId);
}

export function markParticipantLeft(participantId, role, sessionId) {
  db.prepare(
    "UPDATE participants SET left_at = CURRENT_TIMESTAMP, duration_seconds = CAST((julianday(CURRENT_TIMESTAMP) - julianday(joined_at)) * 86400 AS INTEGER) WHERE id = ? AND left_at IS NULL"
  ).run(participantId);
  logEvent(sessionId, "left", role);
}
