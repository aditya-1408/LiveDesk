import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/database.js";
import { signAgent } from "../auth/jwt.js";

export const authRouter = express.Router();

authRouter.post("/login", (req, res) => {
  const { username, password } = req.body;
  const agent = db.prepare("SELECT * FROM agents WHERE username = ?").get(username);
  if (!agent || !bcrypt.compareSync(password || "", agent.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  res.json({
    token: signAgent(agent),
    agent: { id: agent.id, username: agent.username }
  });
});
