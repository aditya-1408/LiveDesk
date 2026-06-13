import express from "express";
import { requireAdmin } from "../auth/authMiddleware.js";
import { db } from "../db/database.js";
import { endSession } from "../services/sessionService.js";
import { closeRoom } from "../sockets/rooms.js";

export const adminRouter = express.Router();

adminRouter.get("/admin/sessions/live", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, COUNT(p.id) AS connected_participants
       FROM sessions s
       LEFT JOIN participants p ON p.session_id = s.id AND p.left_at IS NULL
       WHERE s.status IN ('created', 'active')
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    )
    .all();
  res.json(rows);
});

adminRouter.get("/admin/sessions/history", requireAdmin, (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM participants p WHERE p.session_id = s.id) AS participant_count,
          (SELECT COUNT(*) FROM chat_messages c WHERE c.session_id = s.id) AS chat_count,
          CAST((julianday(COALESCE(s.ended_at, CURRENT_TIMESTAMP)) - julianday(s.created_at)) * 86400 AS INTEGER) AS duration_seconds,
          (SELECT status FROM recordings r WHERE r.session_id = s.id ORDER BY id DESC LIMIT 1) AS recording_status
         FROM sessions s
         ORDER BY s.created_at DESC
         LIMIT 100`
      )
      .all()
  );
});

adminRouter.get("/admin/sessions/:id", requireAdmin, (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const participants = db
    .prepare("SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at ASC")
    .all(req.params.id);
  const events = db
    .prepare("SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC")
    .all(req.params.id);
  const messages = db
    .prepare("SELECT id, sender_role, message, file_url, sent_at FROM chat_messages WHERE session_id = ? ORDER BY sent_at ASC")
    .all(req.params.id);
  const recording = db
    .prepare("SELECT * FROM recordings WHERE session_id = ? ORDER BY id DESC LIMIT 1")
    .get(req.params.id);

  res.json({ ...session, participants, events, messages, recording });
});

adminRouter.post("/admin/sessions/:id/end", requireAdmin, (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  endSession(req.params.id, "agent");
  req.app.get("io")?.to(req.params.id).emit("call-ended", { by: "admin" });
  closeRoom(req.params.id);
  res.json({ ok: true });
});
