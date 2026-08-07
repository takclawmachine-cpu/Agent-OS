import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type AgentDatabase } from "@/server/database";

let database: AgentDatabase | null = null;
let temporaryDirectory: string | null = null;

afterEach(() => {
  database?.close();
  if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  database = null;
  temporaryDirectory = null;
});

describe("database schema", () => {
  it("creates all Phase 2 entities and seeds the local project", () => {
    database = createDatabase(":memory:");
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>;
    const names = new Set(tables.map((table) => table.name));

    ["users", "projects", "agents", "tasks", "plans", "cron_jobs", "mail_logs", "token_usage", "api_connections", "audit_logs", "notifications", "chat_messages", "preview_states", "project_preferences", "search_entries", "vault_note_versions", "usage_caps", "digest_configs", "handoffs", "environments", "skills", "agent_skills", "terminal_commands", "reports", "webhook_events", "backup_records", "backup_drills", "realtime_events"].forEach((name) => expect(names.has(name)).toBe(true));
    expect(database.prepare("SELECT name FROM projects WHERE id = ?").pluck().get("agent-os")).toBe("Agent OS");
    expect(database.prepare("SELECT COUNT(*) FROM skills").pluck().get()).toBe(8);
    expect(database.prepare("SELECT job_type FROM cron_jobs WHERE id = ?").pluck().get("cron-backup")).toBe("backup");
    ["agents", "plans", "github_repositories", "chat_messages", "notifications", "mail_logs", "token_usage", "terminal_commands"]
      .forEach((table) => expect(database?.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get()).toBe(0));
  });

  it("removes exact legacy demos without deleting modified or user-created records", () => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-os-migration-"));
    const filename = path.join(temporaryDirectory, "agent-os.db");
    const now = new Date().toISOString();
    database = createDatabase(filename);
    database.prepare("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?)").run("agent-1", "agent-os", "Hermes", "Orchestrator", "working", 28);
    database.prepare("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?)").run("agent-3", "agent-os", "Renamed Research Agent", "GPT-5.3", "idle", 8);
    database.prepare("INSERT INTO plans VALUES (?, ?, ?, ?, ?, ?, ?)").run("plan-1", "agent-os", "Phase 2 backend migration", "Hermes", "in-review", 1, now);
    database.prepare("INSERT INTO github_repositories VALUES (?, ?, ?, ?, ?, ?, ?)").run("repo-1", "agent-os", null, "agent-os", "local/agent-os", "main", now);
    database.prepare("INSERT INTO chat_messages VALUES (?, ?, ?, ?, ?, ?)").run("chat-1", "agent-os", null, "agent", "Project context loaded. Phase 2 backend is active.", now);
    database.prepare("INSERT INTO chat_messages VALUES (?, ?, ?, ?, ?, ?)").run("chat-user", "agent-os", "demo-admin", "user", "Keep this message.", now);
    database.close();

    database = createDatabase(filename);

    expect(database.prepare("SELECT id FROM agents ORDER BY id").pluck().all()).toEqual(["agent-3"]);
    expect(database.prepare("SELECT COUNT(*) FROM plans").pluck().get()).toBe(0);
    expect(database.prepare("SELECT COUNT(*) FROM github_repositories").pluck().get()).toBe(0);
    expect(database.prepare("SELECT id FROM chat_messages ORDER BY id").pluck().all()).toEqual(["chat-user"]);
  });
});