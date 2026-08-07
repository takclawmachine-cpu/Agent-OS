import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type AgentDatabase } from "@/server/database";

let database: AgentDatabase | null = null;

afterEach(() => database?.close());

describe("database schema", () => {
  it("creates all Phase 2 entities and seeds the local project", () => {
    database = createDatabase(":memory:");
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>;
    const names = new Set(tables.map((table) => table.name));

    ["users", "projects", "agents", "tasks", "plans", "cron_jobs", "mail_logs", "token_usage", "api_connections", "audit_logs", "notifications", "chat_messages", "preview_states", "project_preferences", "search_entries", "vault_note_versions", "usage_caps", "digest_configs", "handoffs", "environments", "skills", "agent_skills", "terminal_commands", "reports", "webhook_events", "backup_records", "backup_drills", "realtime_events"].forEach((name) => expect(names.has(name)).toBe(true));
    expect(database.prepare("SELECT name FROM projects WHERE id = ?").pluck().get("agent-os")).toBe("Agent OS");
    expect(database.prepare("SELECT COUNT(*) FROM skills").pluck().get()).toBe(8);
    expect(database.prepare("SELECT job_type FROM cron_jobs WHERE id = ?").pluck().get("cron-backup")).toBe("backup");
  });
});