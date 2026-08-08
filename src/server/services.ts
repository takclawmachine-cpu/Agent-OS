import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { AgentDatabase } from "@/server/database";
import { HttpError, requirePermission, type Role } from "@/server/policies";

const projectTables = ["agents", "tasks", "plans", "cron_jobs", "mail_logs", "token_usage", "api_connections", "notifications", "chat_messages", "vault_note_versions", "usage_caps", "digest_configs", "handoffs", "environments", "github_repositories", "terminal_commands", "reports"] as const;
const deniedCommand = /(^|\s)(rm|rmdir|del|format|shutdown|reboot|kill|taskkill|sudo|su|chmod|chown|curl|wget|invoke-webrequest|powershell|cmd|bash|sh)(\s|$)/i;
const allowedCommands = new Set(["help", "status", "agents", "pwd"]);

function now() {
  return new Date().toISOString();
}

export function audit(database: AgentDatabase, projectId: string | null, userId: string, action: string, resourceType: string, resourceId?: string, metadata: unknown = {}) {
  database.prepare("INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), projectId, userId, action, resourceType, resourceId ?? null, JSON.stringify(metadata), now());
}

export function listTodos(database: AgentDatabase, projectId: string) {
  return database.prepare("SELECT id, text, completed, link_type AS linkType, COALESCE(link_id, '') AS linkId, version FROM tasks WHERE project_id = ? ORDER BY updated_at DESC").all(projectId);
}

export function createTodo(database: AgentDatabase, projectId: string, input: { id?: string; text: string; linkType?: "none" | "plan" | "agent"; linkId?: string }, role: Role) {
  requirePermission(role, "write");
  if (!input.text?.trim()) throw new HttpError(400, "Task text is required.");
  const linkType = input.linkType ?? "none";
  if (linkType !== "none") {
    const table = linkType === "plan" ? "plans" : "agents";
    const linked = database.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND project_id = ?`).get(input.linkId, projectId);
    if (!linked) throw new HttpError(400, `Linked ${linkType} does not exist in this project.`);
  }
  const id = input.id ?? randomUUID();
  database.prepare("INSERT INTO tasks VALUES (?, ?, ?, 0, ?, ?, 1, ?)").run(id, projectId, input.text.trim(), linkType, linkType === "none" ? null : input.linkId, now());
  return database.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
}

export function updateTodo(database: AgentDatabase, projectId: string, id: string, input: { completed?: boolean; text?: string; version: number }, role: Role) {
  requirePermission(role, "write");
  const result = database.prepare("UPDATE tasks SET text = COALESCE(?, text), completed = COALESCE(?, completed), version = version + 1, updated_at = ? WHERE id = ? AND project_id = ? AND version = ?")
    .run(input.text?.trim() || null, input.completed === undefined ? null : Number(input.completed), now(), id, projectId, input.version);
  if (!result.changes) throw new HttpError(409, "Task changed elsewhere. Refresh and retry.");
  return database.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
}

export function deleteTodo(database: AgentDatabase, projectId: string, id: string, role: Role) {
  requirePermission(role, "write");
  const todo = database.prepare("SELECT * FROM tasks WHERE id = ? AND project_id = ?").get(id, projectId);
  if (!todo) throw new HttpError(404, "Task not found.");
  database.prepare("DELETE FROM tasks WHERE id = ? AND project_id = ?").run(id, projectId);
  return todo;
}

export function restoreTodo(database: AgentDatabase, todo: { id: string; project_id: string; text: string; completed: number; link_type: string; link_id: string | null; version: number; updated_at: string }, role: Role) {
  requirePermission(role, "write");
  database.prepare("INSERT OR IGNORE INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(todo.id, todo.project_id, todo.text, todo.completed, todo.link_type, todo.link_id, todo.version, todo.updated_at);
  return todo;
}

export function listSkills(database: AgentDatabase, projectId: string) {
  return database.prepare("SELECT skills.id, skills.name, skills.category, skills.description, GROUP_CONCAT(agent_skills.agent_id) AS agentIds FROM skills LEFT JOIN agent_skills ON skills.id = agent_skills.skill_id LEFT JOIN agents ON agents.id = agent_skills.agent_id AND agents.project_id = ? GROUP BY skills.id ORDER BY skills.name").all(projectId);
}

export function assignSkill(database: AgentDatabase, projectId: string, agentId: string, skillId: string, assigned: boolean, role: Role) {
  requirePermission(role, "write");
  if (!database.prepare("SELECT 1 FROM agents WHERE id = ? AND project_id = ?").get(agentId, projectId)) throw new HttpError(404, "Agent not found.");
  if (assigned) database.prepare("INSERT OR IGNORE INTO agent_skills VALUES (?, ?, ?)").run(agentId, skillId, now());
  else database.prepare("DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?").run(agentId, skillId);
  return listSkills(database, projectId);
}

export function enforceUsageCap(database: AgentDatabase, projectId: string, additionalCost: number) {
  const usage = Number(database.prepare("SELECT COALESCE(SUM(cost), 0) FROM token_usage WHERE project_id = ? AND created_at >= datetime('now', 'start of month')").pluck().get(projectId));
  const cap = Number(database.prepare("SELECT monthly_cap FROM usage_caps WHERE project_id = ?").pluck().get(projectId) ?? 0);
  if (cap > 0 && usage + additionalCost > cap) throw new HttpError(402, "Project usage cap would be exceeded.");
  return { usage, cap, remaining: Math.max(0, cap - usage) };
}

export function createHandoff(database: AgentDatabase, projectId: string, input: { fromAgentId: string; toAgentId: string; taskId?: string; context: unknown }, role: Role) {
  requirePermission(role, "write");
  if (input.fromAgentId === input.toAgentId) throw new HttpError(400, "Handoff agents must be different.");
  const count = Number(database.prepare("SELECT COUNT(*) FROM agents WHERE project_id = ? AND id IN (?, ?)").pluck().get(projectId, input.fromAgentId, input.toAgentId));
  if (count !== 2) throw new HttpError(400, "Both agents must belong to the active project.");
  const id = randomUUID();
  database.prepare("INSERT INTO handoffs VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, projectId, input.fromAgentId, input.toAgentId, input.taskId ?? null, JSON.stringify(input.context), "pending", now());
  return database.prepare("SELECT * FROM handoffs WHERE id = ?").get(id);
}

export function saveVaultVersion(database: AgentDatabase, projectId: string, notePath: string, content: string, authorId: string) {
  const version = Number(database.prepare("SELECT COALESCE(MAX(version), 0) + 1 FROM vault_note_versions WHERE project_id = ? AND note_path = ?").pluck().get(projectId, notePath));
  database.prepare("INSERT INTO vault_note_versions VALUES (?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), projectId, notePath, version, content, authorId, now());
  return version;
}

export function composeProjectSnapshot(database: AgentDatabase, projectId: string, modules: string[]) {
  const include = new Set(modules.map((module) => module.toLowerCase()));
  return {
    generatedAt: now(),
    agents: include.has("agents") ? database.prepare("SELECT id, name, model, status, completed FROM agents WHERE project_id = ?").all(projectId) : undefined,
    tokens: include.has("tokens") ? database.prepare("SELECT provider, model, input_tokens, output_tokens, cost, created_at FROM token_usage WHERE project_id = ?").all(projectId) : undefined,
    github: include.has("github") ? database.prepare("SELECT name, full_name, branch, updated_at FROM github_repositories WHERE project_id = ?").all(projectId) : undefined,
    cron: include.has("cron") ? database.prepare("SELECT name, schedule, next_run, status FROM cron_jobs WHERE project_id = ?").all(projectId) : undefined,
  };
}

export function createReport(database: AgentDatabase, projectId: string, input: { range: string; modules: string[] }, userId: string, role: Role) {
  requirePermission(role, "write");
  if (!input.modules?.length) throw new HttpError(400, "At least one report module is required.");
  const snapshot = composeProjectSnapshot(database, projectId, input.modules);
  const id = randomUUID();
  database.prepare("INSERT INTO reports VALUES (?, ?, ?, ?, ?, ?)").run(id, projectId, JSON.stringify(input), JSON.stringify(snapshot), userId, now());
  return { id, config: input, snapshot };
}

export function executeTerminal(database: AgentDatabase, projectId: string, userId: string, sessionId: string, command: string, role: Role) {
  requirePermission(role, "terminal");
  const normalized = command.trim().toLowerCase();
  if (!normalized) throw new HttpError(400, "Command is required.");
  if (normalized.length > 256) throw new HttpError(400, "Command must not exceed 256 characters.");
  const id = randomUUID();
  database.prepare("INSERT INTO terminal_commands VALUES (?, ?, ?, ?, ?, '', 'started', ?, NULL)").run(id, sessionId, userId, projectId, normalized, now());
  let output: string;
  let status = "completed";
  if (deniedCommand.test(normalized) || !allowedCommands.has(normalized)) {
    output = deniedCommand.test(normalized) ? "Blocked by the server command deny list." : "Command is not in the project sandbox allow list.";
    status = "denied";
  } else if (normalized === "help") output = "Available: help, status, agents, pwd";
  else if (normalized === "pwd") output = `/projects/${projectId}`;
  else if (normalized === "agents") output = `${database.prepare("SELECT COUNT(*) FROM agents WHERE project_id = ?").pluck().get(projectId)} configured agents`;
  else output = "Database, transport, and project services operational";
  database.prepare("UPDATE terminal_commands SET output = ?, status = ?, completed_at = ? WHERE id = ?").run(output, status, now(), id);
  audit(database, projectId, userId, "terminal.execute", "terminal_command", id, { command: normalized, status });
  return { id, command: normalized, output, status };
}

export function verifyGitHubSignature(secret: string, rawBody: string, signature: string | null) {
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function ingestGitHubWebhook(database: AgentDatabase, rawBody: string, headers: Headers, secret: string) {
  if (!verifyGitHubSignature(secret, rawBody, headers.get("x-hub-signature-256"))) throw new HttpError(401, "Invalid GitHub webhook signature.");
  const deliveryId = headers.get("x-github-delivery");
  if (!deliveryId) throw new HttpError(400, "Missing GitHub delivery ID.");
  const payload = JSON.parse(rawBody) as { repository?: { id?: number; full_name?: string }; action?: string };
  const repository = payload.repository?.full_name
    ? database.prepare("SELECT id, project_id FROM github_repositories WHERE full_name = ?").get(payload.repository.full_name) as { id: string; project_id: string } | undefined
    : undefined;
  const id = randomUUID();
  const eventType = headers.get("x-github-event") ?? "unknown";
  try {
    database.prepare("INSERT INTO webhook_events VALUES (?, ?, 'github', ?, ?, ?, ?)").run(id, repository?.id ?? null, deliveryId, eventType, rawBody, now());
  } catch {
    throw new HttpError(409, "Webhook delivery already processed.");
  }
  if (repository) database.prepare("INSERT INTO notifications VALUES (?, ?, ?, ?, 'info', 0, ?)").run(randomUUID(), repository.project_id, `GitHub ${eventType}`, `${payload.repository?.full_name}: ${payload.action ?? "event received"}`, now());
  return { id, deliveryId, eventType };
}

export function requireProjectEnvironment(database: AgentDatabase, projectId: string, runtimeEnvironment = process.env.AGENT_OS_ENVIRONMENT ?? "Local") {
  const project = database.prepare("SELECT environment FROM projects WHERE id = ? AND deleted_at IS NULL").get(projectId) as { environment: string } | undefined;
  if (!project) throw new HttpError(404, "Project not found.");
  if (project.environment.toLowerCase() !== runtimeEnvironment.toLowerCase()) {
    throw new HttpError(409, `Project environment ${project.environment} does not match server environment ${runtimeEnvironment}.`);
  }
  return project.environment;
}

export async function createBackup(database: AgentDatabase, projectId: string, directory: string, userId: string, role: Role) {
  requirePermission(role, "backup");
  requireProjectEnvironment(database, projectId);
  fs.mkdirSync(directory, { recursive: true });
  const id = randomUUID();
  const location = path.join(directory, `${projectId}-${Date.now()}.db`);
  await database.backup(location);
  const contents = fs.readFileSync(location);
  const checksum = createHash("sha256").update(contents).digest("hex");
  database.prepare("INSERT INTO backup_records VALUES (?, ?, ?, ?, 'completed', ?, ?)").run(id, projectId, location, contents.length, checksum, now());
  audit(database, projectId, userId, "backup.create", "backup", id, { location, checksum });
  return { id, location, sizeBytes: contents.length, checksum };
}

export function restoreBackupFile(backupPath: string, destinationPath: string) {
  if (!fs.existsSync(backupPath)) throw new HttpError(404, "Backup file not found.");
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(backupPath, destinationPath);
}

export function exportProject(database: AgentDatabase, projectId: string, userId: string, role: Role) {
  requirePermission(role, "export");
  const project = database.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!project) throw new HttpError(404, "Project not found.");
  const data: Record<string, unknown> = { project };
  projectTables.forEach((table) => { data[table] = database.prepare(`SELECT * FROM ${table} WHERE project_id = ?`).all(projectId); });
  data.skills = database.prepare("SELECT skills.*, agent_skills.agent_id FROM skills LEFT JOIN agent_skills ON skills.id = agent_skills.skill_id LEFT JOIN agents ON agents.id = agent_skills.agent_id WHERE agents.project_id = ? OR agents.project_id IS NULL").all(projectId);
  audit(database, projectId, userId, "project.export", "project", projectId);
  return { exportedAt: now(), schemaVersion: 1, data };
}

export function requestProjectDeletion(database: AgentDatabase, projectId: string, userId: string, role: Role, recoveryDays = 30) {
  requirePermission(role, "delete");
  const deletedAt = new Date();
  const purgeAfter = new Date(deletedAt.getTime() + recoveryDays * 86400000);
  const result = database.prepare("UPDATE projects SET deleted_at = ?, purge_after = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL").run(deletedAt.toISOString(), purgeAfter.toISOString(), deletedAt.toISOString(), projectId);
  if (!result.changes) throw new HttpError(409, "Project is already deleted or does not exist.");
  audit(database, projectId, userId, "project.soft-delete", "project", projectId, { purgeAfter: purgeAfter.toISOString() });
  return { deletedAt: deletedAt.toISOString(), purgeAfter: purgeAfter.toISOString() };
}

export function recoverProject(database: AgentDatabase, projectId: string, userId: string, role: Role) {
  requirePermission(role, "delete");
  const result = database.prepare("UPDATE projects SET deleted_at = NULL, purge_after = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL AND purge_after > ?").run(now(), projectId, now());
  if (!result.changes) throw new HttpError(410, "Project recovery window has expired or no deletion is pending.");
  audit(database, projectId, userId, "project.recover", "project", projectId);
}

export function purgeProject(database: AgentDatabase, projectId: string, userId: string, role: Role, at = new Date()) {
  requirePermission(role, "delete");
  const eligible = database.prepare("SELECT 1 FROM projects WHERE id = ? AND deleted_at IS NOT NULL AND purge_after <= ?").get(projectId, at.toISOString());
  if (!eligible) throw new HttpError(409, "Project is not eligible for hard deletion.");
  audit(database, projectId, userId, "project.hard-delete", "project", projectId);
  database.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
}