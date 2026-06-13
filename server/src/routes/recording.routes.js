import express from "express";
import { requireAgent, requireAuth } from "../auth/authMiddleware.js";
import { db } from "../db/database.js";

export const recordingRouter = express.Router();

recordingRouter.get("/sessions/:id/recording", requireAuth, (req, res) => {
  const recording = db.prepare("SELECT * FROM recordings WHERE session_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id);
  res.json(recording || { session_id: req.params.id, status: "idle" });
});

recordingRouter.post("/sessions/:id/recording/start", requireAgent, (req, res) => {
  db.prepare("UPDATE recordings SET status = 'recording', started_at = CURRENT_TIMESTAMP WHERE session_id = ?").run(req.params.id);
  res.json({ status: "recording", note: "Recording control is scaffolded; ffmpeg PlainTransport wiring is documented in ARCHITECTURE.md." });
});

recordingRouter.post("/sessions/:id/recording/stop", requireAgent, (req, res) => {
  db.prepare("UPDATE recordings SET status = 'processing', ended_at = CURRENT_TIMESTAMP WHERE session_id = ?").run(req.params.id);
  res.json({ status: "processing", note: "Recording processing is scaffolded for hackathon extension." });
});
