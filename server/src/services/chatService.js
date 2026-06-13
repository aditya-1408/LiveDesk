import { db } from "../db/database.js";

export function addMessage(sessionId, senderRole, message, fileUrl = null) {
  const result = db
    .prepare("INSERT INTO chat_messages (session_id, sender_role, message, file_url) VALUES (?, ?, ?, ?)")
    .run(sessionId, senderRole, message, fileUrl);
  return db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(result.lastInsertRowid);
}

export function listMessages(sessionId) {
  return db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY sent_at ASC").all(sessionId);
}
