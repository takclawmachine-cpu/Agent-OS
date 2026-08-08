import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyLogRetention, pruneBackupFiles, runRecoveryDrills } from "./maintenance.mjs";

let database;
let directory;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-os-maintenance-"));
  database = new Database(path.join(directory, "main.db"));
  database.exec(`
    CREATE TABLE projects (id TEXT PRIMARY KEY, environment TEXT, deleted_at TEXT);
    CREATE TABLE backup_records (id TEXT PRIMARY KEY, project_id TEXT, location TEXT, size_bytes INTEGER, status TEXT, checksum TEXT, created_at TEXT);
    CREATE TABLE backup_drills (id TEXT PRIMARY KEY, backup_id TEXT, project_id TEXT, outcome TEXT, detail TEXT, created_at TEXT);
    CREATE TABLE audit_logs (id TEXT, project_id TEXT, user_id TEXT, action TEXT, resource_type TEXT, resource_id TEXT, metadata_json TEXT, created_at TEXT);
    CREATE TABLE realtime_events (occurred_at TEXT); CREATE TABLE webhook_events (received_at TEXT); CREATE TABLE notifications (created_at TEXT);
    CREATE TABLE terminal_commands (created_at TEXT); CREATE TABLE mail_logs (created_at TEXT);
    INSERT INTO projects VALUES ('agent-os', 'Local', NULL);
  `);
});

afterEach(() => { database.close(); fs.rmSync(directory, { recursive: true, force: true }); });

describe("scheduled maintenance", () => {
  it("restores a real backup to a sandbox and records the outcome", async () => {
    const backupPath = path.join(directory, "backup.db");
    await database.backup(backupPath);
    const contents = fs.readFileSync(backupPath);
    database.prepare("INSERT INTO backup_records VALUES (?, ?, ?, ?, 'completed', ?, ?)").run("backup-1", "agent-os", backupPath, contents.length, createHash("sha256").update(contents).digest("hex"), new Date().toISOString());
    expect(runRecoveryDrills(database, path.join(directory, "sandbox"))).toMatchObject([{ backupId: "backup-1", outcome: "passed" }]);
    expect(database.prepare("SELECT outcome FROM backup_drills").pluck().get()).toBe("passed");
    expect(database.prepare("SELECT action FROM audit_logs").pluck().get()).toBe("backup.drill");
    database.prepare("UPDATE projects SET environment = 'Production'").run();
    expect(runRecoveryDrills(database, path.join(directory, "sandbox-2"), new Date(Date.now() + 8 * 86_400_000), "Local")).toEqual([]);
  });

  it("rotates logs and expires backup files according to policy", () => {
    const old = new Date("2025-01-01T00:00:00.000Z").toISOString();
    for (const [table, column] of [["realtime_events", "occurred_at"], ["webhook_events", "received_at"], ["notifications", "created_at"], ["terminal_commands", "created_at"], ["mail_logs", "created_at"]]) database.prepare(`INSERT INTO ${table} (${column}) VALUES (?)`).run(old);
    const backupPath = path.join(directory, "expired.db");
    fs.writeFileSync(backupPath, "expired");
    database.prepare("INSERT INTO backup_records VALUES (?, ?, ?, ?, 'completed', ?, ?)").run("backup-old", "agent-os", backupPath, 7, "checksum", old);
    expect(pruneBackupFiles(database, new Date("2026-08-07T00:00:00.000Z"))).toBe(1);
    expect(applyLogRetention(database, new Date("2026-08-07T00:00:00.000Z")).terminal_commands).toBe(1);
    expect(fs.existsSync(backupPath)).toBe(false);
  });
});