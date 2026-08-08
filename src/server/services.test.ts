import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type AgentDatabase } from "@/server/database";
import { HttpError } from "@/server/policies";
import {
  createBackup, createHandoff, createReport, createTodo, enforceUsageCap, executeTerminal,
  exportProject, ingestGitHubWebhook, purgeProject, recoverProject, requestProjectDeletion,
  requireProjectEnvironment, restoreBackupFile, saveVaultVersion, updateTodo, verifyGitHubSignature,
} from "@/server/services";

let database: AgentDatabase;

beforeEach(() => {
  database = createDatabase(":memory:");
  const now = new Date().toISOString();
  database.prepare("INSERT INTO projects (id, name, environment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("agent-os", "Test Project", "Local", now, now);
  database.prepare("INSERT INTO usage_caps VALUES (?, ?, ?, ?)").run("agent-os", 7500, 80, now);
  const insertAgent = database.prepare("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?)");
  insertAgent.run("agent-1", "agent-os", "Test Coordinator", "test-model", "idle", 0);
  insertAgent.run("agent-2", "agent-os", "Test Specialist", "test-model", "idle", 0);
});
afterEach(() => database.close());

describe("backend policies and services", () => {
  it("enforces roles and optimistic conflict resolution", () => {
    expect(() => createTodo(database, "agent-os", { text: "Denied" }, "viewer")).toThrow(HttpError);
    const todo = createTodo(database, "agent-os", { text: "Persist me", linkType: "agent", linkId: "agent-1" }, "editor") as { id: string };
    updateTodo(database, "agent-os", todo.id, { completed: true, version: 1 }, "editor");
    expect(() => updateTodo(database, "agent-os", todo.id, { completed: false, version: 1 }, "editor")).toThrowError(/changed elsewhere/);
  });

  it("enforces usage caps", () => {
    database.prepare("INSERT INTO token_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("usage-1", "agent-os", "openai", "gpt", 10, 10, 7499, new Date().toISOString());
    expect(() => enforceUsageCap(database, "agent-os", 2)).toThrowError(/cap/);
    expect(enforceUsageCap(database, "agent-os", 1).remaining).toBe(1);
  });

  it("persists handoffs, vault versions, and report snapshots", () => {
    const handoff = createHandoff(database, "agent-os", { fromAgentId: "agent-1", toAgentId: "agent-2", context: { reason: "specialist" } }, "editor") as { id: string };
    expect(handoff.id).toBeTruthy();
    expect(saveVaultVersion(database, "agent-os", "notes/status.md", "one", "demo-admin")).toBe(1);
    expect(saveVaultVersion(database, "agent-os", "notes/status.md", "two", "demo-admin")).toBe(2);
    const report = createReport(database, "agent-os", { range: "Last 7 days", modules: ["Agents", "Cron"] }, "demo-admin", "admin");
    expect(report.snapshot.agents).toHaveLength(2);
    expect(database.prepare("SELECT COUNT(*) FROM reports").pluck().get()).toBe(1);
  });

  it("sandboxes terminal commands and records denied attempts", () => {
    const denied = executeTerminal(database, "agent-os", "demo-admin", "session-1", "rm -rf /", "admin");
    expect(denied.status).toBe("denied");
    expect(denied.output).toMatch(/Blocked/);
    expect(database.prepare("SELECT status FROM terminal_commands WHERE id = ?").pluck().get(denied.id)).toBe("denied");
    expect(() => executeTerminal(database, "agent-os", "demo-admin", "session-1", "status", "viewer")).toThrow(HttpError);
    expect(() => executeTerminal(database, "agent-os", "demo-admin", "session-1", "x".repeat(257), "admin")).toThrowError(/256/);
    expect(executeTerminal(database, "agent-os", "demo-admin", "session-1", "agents", "editor").output).toContain("2 configured");
  });

  it("verifies GitHub signatures and rejects replayed deliveries", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ action: "opened", repository: { full_name: "owner/repo" } });
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyGitHubSignature(secret, body, signature)).toBe(true);
    expect(verifyGitHubSignature(secret, body, "sha256=bad")).toBe(false);
    const headers = new Headers({ "x-hub-signature-256": signature, "x-github-delivery": "delivery-1", "x-github-event": "issues" });
    expect(ingestGitHubWebhook(database, body, headers, secret).eventType).toBe("issues");
    expect(() => ingestGitHubWebhook(database, body, headers, secret)).toThrowError(/already processed/);
  });

  it("backs up and restores an integrity-checked database", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-os-backup-"));
    const source = path.join(directory, "source.db");
    database.close();
    database = createDatabase(source);
    const now = new Date().toISOString();
    database.prepare("INSERT INTO projects (id, name, environment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("agent-os", "Backup Test", "Local", now, now);
    createTodo(database, "agent-os", { text: "Included in backup" }, "admin");
    const backup = await createBackup(database, "agent-os", directory, "demo-admin", "admin");
    expect(backup.sizeBytes).toBeGreaterThan(0);
    const restoredPath = path.join(directory, "restored.db");
    restoreBackupFile(backup.location, restoredPath);
    const restored = createDatabase(restoredPath);
    expect(restored.prepare("SELECT COUNT(*) FROM tasks WHERE text = ?").pluck().get("Included in backup")).toBe(1);
    restored.close();
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
    database = createDatabase(":memory:");
  });

  it("isolates sensitive operations by runtime environment", () => {
    expect(requireProjectEnvironment(database, "agent-os", "Local")).toBe("Local");
    expect(() => requireProjectEnvironment(database, "agent-os", "Production")).toThrowError(/does not match/);
  });

  it("exports every required project collection", () => {
    const exported = exportProject(database, "agent-os", "demo-admin", "viewer");
    expect(Object.keys(exported.data)).toEqual(expect.arrayContaining(["agents", "tasks", "plans", "mail_logs", "token_usage", "vault_note_versions", "skills"]));
    expect(database.prepare("SELECT action FROM audit_logs WHERE action = 'project.export'").pluck().get()).toBe("project.export");
  });

  it("recovers soft-deleted projects and gates hard deletion by time", () => {
    requestProjectDeletion(database, "agent-os", "demo-admin", "admin", 30);
    expect(() => purgeProject(database, "agent-os", "demo-admin", "admin")).toThrowError(/not eligible/);
    recoverProject(database, "agent-os", "demo-admin", "admin");
    expect(database.prepare("SELECT deleted_at FROM projects WHERE id = ?").pluck().get("agent-os")).toBeNull();
    requestProjectDeletion(database, "agent-os", "demo-admin", "admin", -1);
    purgeProject(database, "agent-os", "demo-admin", "admin");
    expect(database.prepare("SELECT 1 FROM projects WHERE id = ?").get("agent-os")).toBeUndefined();
  });
});