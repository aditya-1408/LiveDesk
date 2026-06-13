import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { requireAgent, requireAuth } from "../auth/authMiddleware.js";
import { db } from "../db/database.js";
import { config } from "../config.js";
import { canAccessSession } from "../services/accessService.js";
import { setRecordingStatus } from "../services/sessionService.js";

export const recordingRouter = express.Router();

fs.mkdirSync(config.recordingDir, { recursive: true });

const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.recordingDir),
    filename: (req, _file, cb) => cb(null, `${req.params.id}-${uuidv4()}.webm`)
  }),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["video/webm", "video/mp4", "application/octet-stream"].includes(file.mimetype)) {
      return cb(new Error("Unsupported recording type"));
    }
    cb(null, true);
  }
});

recordingRouter.get("/sessions/:id/recording", requireAuth, (req, res) => {
  const access = canAccessSession(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ error: access.error });
  const recording = db.prepare("SELECT * FROM recordings WHERE session_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id);
  res.json({
    ...(recording || { session_id: req.params.id, status: "idle" }),
    download_url: recording?.file_path ? `/api/sessions/${req.params.id}/recording/download` : null
  });
});

recordingRouter.post("/sessions/:id/recording/start", requireAgent, (req, res) => {
  const access = canAccessSession(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ error: access.error });
  res.json(setRecordingStatus(req.params.id, "recording"));
});

recordingRouter.post("/sessions/:id/recording/stop", requireAgent, (req, res) => {
  const access = canAccessSession(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ error: access.error });
  res.json(setRecordingStatus(req.params.id, "processing"));
});

recordingRouter.post("/sessions/:id/recording/upload", requireAgent, recordingUpload.single("recording"), (req, res) => {
  const access = canAccessSession(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ error: access.error });
  if (!req.file) return res.status(400).json({ error: "No recording uploaded" });
  const recording = setRecordingStatus(req.params.id, "ready", req.file.filename);
  res.status(201).json({ ...recording, download_url: `/api/sessions/${req.params.id}/recording/download` });
});

recordingRouter.get("/sessions/:id/recording/download", requireAuth, (req, res) => {
  const access = canAccessSession(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ error: access.error });
  const recording = db.prepare("SELECT * FROM recordings WHERE session_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id);
  if (!recording?.file_path) return res.status(404).json({ error: "Recording is not ready" });
  const filePath = path.join(config.recordingDir, path.basename(recording.file_path));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Recording file missing" });
  res.download(filePath, `session-${req.params.id}.webm`);
});
