import path from "node:path";

import { closeDatabase, getDatabase } from "@/server/database";
import { readModuleState, writeModuleState } from "@/server/module-state";
import { checkProviders, completeChat, sendProviderMail } from "@/server/providers";
import { enforceRateLimit, errorResponse, HttpError, readJson, requirePermission, requireSameOrigin, requireSession } from "@/server/policies";
import {
  assignSkill, audit, createBackup, createHandoff, createReport, createTodo, deleteTodo, enforceUsageCap, executeTerminal, exportProject,
  listSkills, listTodos, purgeProject, recoverProject, requestProjectDeletion, requireProjectEnvironment, restoreBackupFile, restoreTodo, saveVaultVersion, updateTodo,
} from "@/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedReadTables: Record<string, string> = {
  agents: "SELECT * FROM agents WHERE project_id = ?",
  plans: "SELECT * FROM plans WHERE project_id = ?",
  notifications: "SELECT * FROM notifications WHERE project_id = ? ORDER BY created_at DESC",
  mail: "SELECT * FROM mail_logs WHERE project_id = ? ORDER BY created_at DESC",
  cron: "SELECT * FROM cron_jobs WHERE project_id = ?",
  tokens: "SELECT * FROM token_usage WHERE project_id = ? ORDER BY created_at DESC",
  github: "SELECT * FROM github_repositories WHERE project_id = ?",
  digests: "SELECT * FROM digest_configs WHERE project_id = ?",
  environments: "SELECT * FROM environments WHERE project_id = ?",
  reports: "SELECT * FROM reports WHERE project_id = ? ORDER BY created_at DESC",
  backups: "SELECT * FROM backup_records WHERE project_id = ? ORDER BY created_at DESC",
  "backup-drills": "SELECT * FROM backup_drills WHERE project_id = ? ORDER BY created_at DESC",
  terminal: "SELECT * FROM terminal_commands WHERE project_id = ? ORDER BY created_at",
  audit: "SELECT * FROM audit_logs WHERE project_id = ? ORDER BY created_at DESC",
  webhooks: "SELECT webhook_events.* FROM webhook_events JOIN github_repositories ON github_repositories.id = webhook_events.repository_id WHERE github_repositories.project_id = ? ORDER BY webhook_events.received_at DESC",
  preview: "SELECT * FROM preview_states WHERE project_id = ?",
};
const adminLogResources = new Set(["audit", "backups", "backup-drills", "terminal", "webhooks"]);

function projectId(request: Request) {
  return new URL(request.url).searchParams.get("projectId") ?? request.headers.get("x-project-id") ?? "agent-os";
}

export async function GET(request: Request, context: RouteContext<"/api/[resource]">) {
  try {
    const session = requireSession(request);
    const { resource } = await context.params;
    enforceRateLimit(`api:read:${session.userId}`, 300, 60_000);
    const database = getDatabase();
    const project = projectId(request);
    requirePermission(session.role, "read");
    if (resource === "todos") return Response.json({ data: listTodos(database, project) });
    if (resource === "state") return Response.json({ data: readModuleState(database, project) });
    if (resource === "skills") return Response.json({ data: listSkills(database, project) });
    if (resource === "providers" || resource === "status") {
      const health = await checkProviders();
      const save = database.prepare("INSERT INTO api_connections VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,latency_ms=excluded.latency_ms,checked_at=excluded.checked_at");
      health.forEach((connection) => save.run(`provider-${connection.provider}`, project, connection.provider, connection.status === "connected" ? "connected" : connection.status === "degraded" ? "degraded" : "disconnected", connection.latencyMs, new Date().toISOString()));
      return Response.json({ data: health });
    }
    if (resource === "export") return Response.json(exportProject(database, project, session.userId, session.role), { headers: { "content-disposition": `attachment; filename=${project}-export.json` } });
    if (resource === "realtime") {
      const cursor = Number(new URL(request.url).searchParams.get("cursor") ?? 0);
      return Response.json({ data: database.prepare("SELECT sequence, id, project_id AS projectId, channel, event_type AS type, payload_json AS payload, occurred_at AS occurredAt FROM realtime_events WHERE project_id = ? AND sequence > ? ORDER BY sequence LIMIT 100").all(project, cursor) });
    }
    const sql = allowedReadTables[resource];
    if (!sql) throw new HttpError(404, "Unknown API resource.");
    if (adminLogResources.has(resource) && session.role !== "admin") throw new HttpError(403, "Admin access is required for sensitive logs.");
    return Response.json({ data: database.prepare(sql).all(project) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext<"/api/[resource]">) {
  try {
    const session = requireSession(request);
    requireSameOrigin(request);
    const { resource } = await context.params;
    enforceRateLimit(`api:write:${session.userId}`, 120, 60_000);
    const database = getDatabase();
    const project = projectId(request);
    const role = session.role;
    const body = await readJson<Record<string, unknown>>(request);
    if (resource === "providers") {
      requirePermission(role, "write");
      if (body.action === "mail") {
        const result = await sendProviderMail({ to: String(body.to), subject: String(body.subject), text: body.text ? String(body.text) : undefined });
        audit(database, project, session.userId, "mail.send", "mail", undefined, { to: String(body.to), subject: String(body.subject) });
        return Response.json({ data: result });
      }
      if (body.action === "chat") {
        enforceUsageCap(database, project, 0.01);
        const provider = ["hermes", "openai", "openrouter", "groq", "xai"].includes(String(body.provider)) ? String(body.provider) as "hermes" | "openai" | "openrouter" | "groq" | "xai" : "hermes";
        const result = await completeChat(provider, String(body.message ?? ""));
        database.prepare("INSERT INTO token_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), project, provider, provider === "hermes" ? "local-auto" : process.env.CHAT_MODEL ?? "gpt-4o-mini", result.usage.prompt_tokens ?? 0, result.usage.completion_tokens ?? 0, provider === "hermes" ? 0 : 0.01, new Date().toISOString());
        return Response.json({ data: result });
      }
    }
    if (resource === "todos") {
      if (body.action === "restore") return Response.json({ data: restoreTodo(database, body.todo as Parameters<typeof restoreTodo>[1], role) }, { status: 201 });
      return Response.json({ data: createTodo(database, project, body as Parameters<typeof createTodo>[2], role) }, { status: 201 });
    }
    if (resource === "skills") return Response.json({ data: assignSkill(database, project, String(body.agentId), String(body.skillId), Boolean(body.assigned), role) });
    if (resource === "terminal") return Response.json({ data: executeTerminal(database, project, session.userId, String(body.sessionId ?? "web"), String(body.command ?? ""), role) });
    if (resource === "reports") return Response.json({ data: createReport(database, project, body as Parameters<typeof createReport>[2], session.userId, role) }, { status: 201 });
    if (resource === "handoffs") return Response.json({ data: createHandoff(database, project, body as Parameters<typeof createHandoff>[2], role) }, { status: 201 });
    if (resource === "vault-versions") return Response.json({ data: { version: saveVaultVersion(database, project, String(body.path), String(body.content), session.userId) } }, { status: 201 });
    if (resource === "backups") {
      if (body.action === "restore") {
        requirePermission(role, "restore");
        requireProjectEnvironment(database, project);
        const record = database.prepare("SELECT id, location FROM backup_records WHERE id = ? AND project_id = ? AND status = 'completed'").get(String(body.backupId), project) as { id: string; location: string } | undefined;
        if (!record) throw new HttpError(404, "Backup record not found.");
        const destination = database.name;
        closeDatabase();
        restoreBackupFile(record.location, destination);
        audit(getDatabase(), project, session.userId, "backup.restore", "backup", record.id);
        return Response.json({ data: { restored: true, backupId: record.id } });
      }
      return Response.json({ data: await createBackup(database, project, path.join(process.cwd(), "backups"), session.userId, role) }, { status: 201 });
    }
    if (resource === "projects") {
      const action = String(body.action);
      if (action === "soft-delete") return Response.json({ data: requestProjectDeletion(database, project, session.userId, role) });
      if (action === "recover") return Response.json({ data: recoverProject(database, project, session.userId, role) });
      if (action === "purge") return Response.json({ data: purgeProject(database, project, session.userId, role) });
    }
    throw new HttpError(404, "Unknown API action.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/[resource]">) {
  try {
    const session = requireSession(request);
    requireSameOrigin(request);
    enforceRateLimit(`api:write:${session.userId}`, 120, 60_000);
    const { resource } = await context.params;
    if (resource !== "todos") throw new HttpError(404, "Unknown API action.");
    const body = await readJson<{ id: string; completed?: boolean; text?: string; version: number }>(request);
    return Response.json({ data: updateTodo(getDatabase(), projectId(request), body.id, body, session.role) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<"/api/[resource]">) {
  try {
    const session = requireSession(request);
    requireSameOrigin(request);
    enforceRateLimit(`api:write:${session.userId}`, 120, 60_000);
    const { resource } = await context.params;
    if (resource !== "todos") throw new HttpError(404, "Unknown API action.");
    const body = await readJson<{ id: string }>(request);
    return Response.json({ data: deleteTodo(getDatabase(), projectId(request), body.id, session.role) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext<"/api/[resource]">) {
  try {
    const session = requireSession(request);
    requireSameOrigin(request);
    enforceRateLimit(`api:write:${session.userId}`, 120, 60_000);
    const { resource } = await context.params;
    if (resource !== "state") throw new HttpError(404, "Unknown API action.");
    const body = await readJson<{ kind: "original" | "operational"; state: Record<string, unknown> }>(request);
    writeModuleState(getDatabase(), projectId(request), body.kind, body.state, session.userId, session.role);
    return Response.json({ data: { saved: true } });
  } catch (error) {
    return errorResponse(error);
  }
}