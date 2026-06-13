import express from "express";
import { requireAgent } from "../auth/authMiddleware.js";
import { db } from "../db/database.js";

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
