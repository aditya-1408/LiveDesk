import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { canAccessSession } from "../services/accessService.js";
import { addMessage } from "../services/chatService.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) return cb(new Error("Unsupported file type"));
    cb(null, true);
  }
});

export const uploadRouter = express.Router();

uploadRouter.post("/sessions/:id/chat/upload", requireAuth, upload.single("file"), (req, res) => {
  const access = canAccessSession(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ error: access.error });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const message = addMessage(
    req.params.id,
    req.user.role,
    req.body.message || req.file.originalname,
    `/api/sessions/${req.params.id}/files/${req.file.filename}`
  );
  res.status(201).json({ message });
});

uploadRouter.get("/sessions/:id/files/:filename", requireAuth, (req, res) => {
  const access = canAccessSession(req.user, req.params.id);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const safeName = path.basename(req.params.filename);
  const filePath = path.join(config.uploadDir, safeName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  res.download(filePath);
});
