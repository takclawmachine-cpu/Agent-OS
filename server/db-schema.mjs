import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Kept in sync with src/server/database.ts. This lives as plain JS so it can
// be required by companion Node scripts (realtime, scheduler) that run
// outside the Next.js bundle and must not race the web process's lazy
// database initialization on a fresh volume.
export const schema = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer','guest')), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, environment TEXT NOT NULL DEFAULT 'Local', version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT, purge_after TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name TEXT NOT NULL, model TEXT NOT NULL,
  status TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, text TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0,
  link_type TEXT NOT NULL DEFAULT 'none', link_id TEXT, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name TEXT NOT NULL, owner TEXT NOT NULL, status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name TEXT NOT NULL, schedule TEXT NOT NULL,
  next_run TEXT, status TEXT NOT NULL, job_type TEXT NOT NULL DEFAULT 'general'
);
CREATE TABLE IF NOT EXISTS mail_logs (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, recipient TEXT NOT NULL, subject TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS token_usage (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, provider TEXT NOT NULL, model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL, cost REAL NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS api_connections (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, provider TEXT NOT NULL, status TEXT NOT NULL,
  latency_ms INTEGER, checked_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, user_id TEXT NOT NULL, action TEXT NOT NULL,
  resource_type TEXT NOT NULL, resource_id TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title TEXT NOT NULL, detail TEXT NOT NULL,
  severity TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT,
  sender TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS preview_states (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, state TEXT NOT NULL, url TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_preferences (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, preferences_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS search_entries (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, kind TEXT NOT NULL, title TEXT NOT NULL,
  body TEXT NOT NULL, resource_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vault_note_versions (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, note_path TEXT NOT NULL, version INTEGER NOT NULL,
  content TEXT NOT NULL, author_id TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(project_id, note_path, version)
);
CREATE TABLE IF NOT EXISTS usage_caps (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, monthly_cap REAL NOT NULL, alert_threshold INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS digest_configs (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, cadence TEXT NOT NULL, delivery_time TEXT NOT NULL,
  modules_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, from_agent_id TEXT NOT NULL REFERENCES agents(id),
  to_agent_id TEXT NOT NULL REFERENCES agents(id), task_id TEXT REFERENCES tasks(id), context_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name TEXT NOT NULL, endpoint TEXT NOT NULL,
  status TEXT NOT NULL, UNIQUE(project_id, name)
);
CREATE TABLE IF NOT EXISTS github_repositories (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, provider_id TEXT, name TEXT NOT NULL,
  full_name TEXT NOT NULL, branch TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL, description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL, PRIMARY KEY(agent_id, skill_id)
);
CREATE TABLE IF NOT EXISTS terminal_commands (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  command TEXT NOT NULL, output TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, config_json TEXT NOT NULL,
  snapshot_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, repository_id TEXT REFERENCES github_repositories(id) ON DELETE SET NULL, provider TEXT NOT NULL,
  delivery_id TEXT NOT NULL UNIQUE, event_type TEXT NOT NULL, payload_json TEXT NOT NULL, received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS backup_records (
  id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, location TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL, checksum TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS backup_drills (
  id TEXT PRIMARY KEY, backup_id TEXT REFERENCES backup_records(id) ON DELETE SET NULL, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS realtime_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, event_type TEXT NOT NULL, payload_json TEXT NOT NULL, occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_realtime_project_sequence ON realtime_events(project_id, sequence);
CREATE INDEX IF NOT EXISTS idx_audit_project_created ON audit_logs(project_id, created_at);
`;

export function ensureSchema(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.exec(schema);
  database.close();
}
