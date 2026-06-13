import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

export function initDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);

  const agentColumns = db.prepare("PRAGMA table_info(agents)").all();
  if (!agentColumns.some((column) => column.name === "role")) {
    db.prepare("ALTER TABLE agents ADD COLUMN role TEXT NOT NULL DEFAULT 'agent'").run();
  }

  const existingAgent = db.prepare("SELECT id FROM agents WHERE username = ?").get("agent");
  if (!existingAgent) {
    const passwordHash = bcrypt.hashSync("agent123", 10);
    db.prepare("INSERT INTO agents (username, password_hash, role) VALUES (?, ?, 'agent')").run("agent", passwordHash);
    logger.info("Seeded default agent login: agent / agent123");
  }

  const existingAdmin = db.prepare("SELECT id FROM agents WHERE username = ?").get("admin");
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO agents (username, password_hash, role) VALUES (?, ?, 'admin')").run("admin", passwordHash);
    logger.info("Seeded default admin login: admin / admin123");
  }

  db.prepare("UPDATE sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE status = 'active'").run();
}
