import express from "express";
import { requireAgent } from "../auth/authMiddleware.js";
import { db } from "../db/database.js";
import { endSession } from "../services/sessionService.js";
import { closeRoom } from "../sockets/rooms.js";

export const adminRouter = express.Router();

adminRouter.get("/admin/sessions/live", requireAgent, (req, res) => {
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

adminRouter.get("/admin/sessions/history", requireAgent, (req, res) => {
  res.json(db.prepare("SELECT * FROM sessions ORDER BY created_at DESC LIMIT 100").all());
});

adminRouter.post("/admin/sessions/:id/end", requireAgent, (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  endSession(req.params.id, "agent");
  req.app.get("io")?.to(req.params.id).emit("call-ended", { by: "admin" });
  closeRoom(req.params.id);
  res.json({ ok: true });
});
