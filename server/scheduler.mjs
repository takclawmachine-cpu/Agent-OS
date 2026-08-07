import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import { applyLogRetention, pruneBackupFiles, runRecoveryDrills } from "./maintenance.mjs";

const environmentPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(environmentPath)) process.loadEnvFile?.(environmentPath);

const databasePath = process.env.AGENT_OS_DATABASE_PATH ?? path.join(process.cwd(), "data", "agent-os.db");
const backupDirectory = process.env.AGENT_OS_BACKUP_PATH ?? path.join(process.cwd(), "backups");
const runtimeEnvironment = process.env.AGENT_OS_ENVIRONMENT ?? "Local";
fs.mkdirSync(backupDirectory, { recursive: true });
const database = new Database(databasePath);
database.pragma("foreign_keys = ON");
database.exec("CREATE TABLE IF NOT EXISTS backup_drills (id TEXT PRIMARY KEY, backup_id TEXT REFERENCES backup_records(id) ON DELETE SET NULL, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, outcome TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);");

async function runBackupJobs() {
  const jobs = database.prepare("SELECT cron_jobs.project_id FROM cron_jobs JOIN projects ON projects.id = cron_jobs.project_id WHERE cron_jobs.job_type = 'backup' AND cron_jobs.status = 'active' AND lower(projects.environment) = lower(?)").all(runtimeEnvironment);
  for (const job of jobs) {
    const recent = database.prepare("SELECT 1 FROM backup_records WHERE project_id = ? AND created_at > datetime('now', '-23 hours') AND status = 'completed'").get(job.project_id);
    if (recent) continue;
    const id = randomUUID();
    const location = path.join(backupDirectory, `${job.project_id}-${Date.now()}.db`);
    await database.backup(location);
    const contents = fs.readFileSync(location);
    const checksum = createHash("sha256").update(contents).digest("hex");
    database.prepare("INSERT INTO backup_records VALUES (?, ?, ?, ?, 'completed', ?, ?)").run(id, job.project_id, location, contents.length, checksum, new Date().toISOString());
    database.prepare("INSERT INTO audit_logs VALUES (?, ?, 'scheduler', 'backup.create', 'backup', ?, ?, ?)").run(randomUUID(), job.project_id, id, JSON.stringify({ location, checksum }), new Date().toISOString());
  }
}

function runDigestJobs() {
  const configs = database.prepare("SELECT project_id,cadence,modules_json FROM digest_configs").all();
  for (const config of configs) {
    const modifier = config.cadence === "weekly" ? "-6 days" : "-23 hours";
    const recent = database.prepare("SELECT 1 FROM reports WHERE project_id=? AND created_at > datetime('now', ?)").get(config.project_id, modifier);
    if (recent) continue;
    const modules = JSON.parse(config.modules_json);
    const snapshot = {
      generatedAt: new Date().toISOString(),
      agents: modules.includes("Agents") ? database.prepare("SELECT id,name,status FROM agents WHERE project_id=?").all(config.project_id) : undefined,
      tokens: modules.includes("Tokens") ? database.prepare("SELECT provider,model,input_tokens,output_tokens,cost FROM token_usage WHERE project_id=?").all(config.project_id) : undefined,
      github: modules.includes("GitHub") ? database.prepare("SELECT name,full_name,branch FROM github_repositories WHERE project_id=?").all(config.project_id) : undefined,
      cron: modules.includes("Cron") ? database.prepare("SELECT name,schedule,status FROM cron_jobs WHERE project_id=?").all(config.project_id) : undefined,
    };
    database.prepare("INSERT INTO reports VALUES (?, ?, ?, ?, 'scheduler', ?)").run(randomUUID(), config.project_id, JSON.stringify({ range: config.cadence, modules }), JSON.stringify(snapshot), new Date().toISOString());
  }
}

await runBackupJobs();
runDigestJobs();
runRecoveryDrills(database, path.join(backupDirectory, ".drills"), new Date(), runtimeEnvironment);
pruneBackupFiles(database);
applyLogRetention(database);
const timer = setInterval(() => { void runBackupJobs(); runDigestJobs(); runRecoveryDrills(database, path.join(backupDirectory, ".drills"), new Date(), runtimeEnvironment); pruneBackupFiles(database); applyLogRetention(database); }, 60_000);
function shutdown() { clearInterval(timer); database.close(); process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);