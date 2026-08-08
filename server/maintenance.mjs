import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const day = 86_400_000;

function cutoff(now, days) {
  return new Date(now.getTime() - days * day).toISOString();
}

export function applyLogRetention(database, now = new Date()) {
  const policies = [
    ["realtime_events", "occurred_at", 14],
    ["webhook_events", "received_at", 45],
    ["notifications", "created_at", 90],
    ["terminal_commands", "created_at", 180],
    ["mail_logs", "created_at", 180],
    ["backup_drills", "created_at", 365],
    ["backup_records", "created_at", 365],
  ];
  return Object.fromEntries(policies.map(([table, column, days]) => [table, database.prepare(`DELETE FROM ${table} WHERE ${column} < ?`).run(cutoff(now, days)).changes]));
}

export function pruneBackupFiles(database, now = new Date()) {
  const expired = database.prepare("SELECT id, location FROM backup_records WHERE created_at < ? AND status = 'completed'").all(cutoff(now, 90));
  let removed = 0;
  for (const backup of expired) {
    if (fs.existsSync(backup.location)) {
      fs.rmSync(backup.location, { force: true });
      removed += 1;
    }
    database.prepare("UPDATE backup_records SET status = 'expired' WHERE id = ?").run(backup.id);
  }
  return removed;
}

export function runRecoveryDrills(database, sandboxDirectory, now = new Date(), runtimeEnvironment = process.env.AGENT_OS_ENVIRONMENT ?? "Local") {
  fs.mkdirSync(sandboxDirectory, { recursive: true });
  const backups = database.prepare(`
    SELECT backup_records.* FROM backup_records
    JOIN projects ON projects.id = backup_records.project_id
    WHERE backup_records.status = 'completed' AND projects.deleted_at IS NULL AND lower(projects.environment) = lower(?)
      AND NOT EXISTS (SELECT 1 FROM backup_drills WHERE backup_id = backup_records.id AND created_at >= ?)
    GROUP BY backup_records.project_id HAVING backup_records.created_at = MAX(backup_records.created_at)
  `).all(runtimeEnvironment, cutoff(now, 7));
  const results = [];
  for (const backup of backups) {
    const drillId = randomUUID();
    const sandboxPath = path.join(sandboxDirectory, `${drillId}.db`);
    let outcome = "passed";
    let detail = "Checksum and SQLite integrity verified.";
    try {
      if (!fs.existsSync(backup.location)) throw new Error("Backup file is missing.");
      const checksum = createHash("sha256").update(fs.readFileSync(backup.location)).digest("hex");
      if (checksum !== backup.checksum) throw new Error("Backup checksum does not match.");
      fs.copyFileSync(backup.location, sandboxPath);
      const sandbox = new Database(sandboxPath, { readonly: true, fileMustExist: true });
      try {
        if (sandbox.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("SQLite integrity check failed.");
        if (!sandbox.prepare("SELECT 1 FROM projects WHERE id = ?").get(backup.project_id)) throw new Error("Project data is missing from restored backup.");
      } finally {
        sandbox.close();
      }
    } catch (error) {
      outcome = "failed";
      detail = error instanceof Error ? error.message.slice(0, 500) : "Recovery drill failed.";
    } finally {
      fs.rmSync(sandboxPath, { force: true });
    }
    database.prepare("INSERT INTO backup_drills VALUES (?, ?, ?, ?, ?, ?)").run(drillId, backup.id, backup.project_id, outcome, detail, now.toISOString());
    database.prepare("INSERT INTO audit_logs VALUES (?, ?, 'scheduler', 'backup.drill', 'backup', ?, ?, ?)").run(randomUUID(), backup.project_id, backup.id, JSON.stringify({ drillId, outcome, detail }), now.toISOString());
    results.push({ backupId: backup.id, outcome, detail });
  }
  return results;
}