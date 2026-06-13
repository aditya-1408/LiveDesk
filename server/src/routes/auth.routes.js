import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/database.js";
import { config } from "../config.js";
import { signUser } from "../auth/jwt.js";

export const authRouter = express.Router();

authRouter.post("/login", (req, res) => {
  const { username, password, role } = req.body;
  if (role && !["agent", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  const agent = db.prepare("SELECT * FROM agents WHERE username = ?").get(username);
  if (!agent || !bcrypt.compareSync(password || "", agent.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const agentRole = agent.role || "agent";
  if (role && agentRole !== role) {
    return res.status(403).json({ error: `Use the ${agentRole} login for this account` });
  }

  res.json({
    token: signUser(agent),
    user: { id: agent.id, username: agent.username, role: agentRole },
    agent: { id: agent.id, username: agent.username, role: agentRole }
  });
});

authRouter.post("/signup", (req, res) => {
  const { username, password, role = "agent", adminCode } = req.body;
  const cleanUsername = String(username || "").trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
  if (!password || String(password).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (!["agent", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (role === "admin" && adminCode !== config.adminSignupCode) {
    return res.status(403).json({ error: "Invalid admin signup code" });
  }

  const existing = db.prepare("SELECT id FROM agents WHERE username = ?").get(cleanUsername);
  if (existing) return res.status(409).json({ error: "Username already exists" });

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const result = db
    .prepare("INSERT INTO agents (username, password_hash, role) VALUES (?, ?, ?)")
    .run(cleanUsername, passwordHash, role);
  const user = { id: result.lastInsertRowid, username: cleanUsername, role };
  res.status(201).json({ token: signUser(user), user, agent: user });
});
