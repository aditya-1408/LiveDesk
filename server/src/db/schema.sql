CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  client_id TEXT,
  socket_id TEXT,
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  left_at TEXT,
  duration_seconds INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT,
  file_url TEXT,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS recordings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  file_path TEXT,
  started_at TEXT,
  ended_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS session_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  role TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
