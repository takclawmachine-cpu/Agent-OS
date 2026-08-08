import type { AgentDatabase } from "@/server/database";
import { requirePermission, type Role } from "@/server/policies";
import { audit } from "@/server/services";

type RecordValue = Record<string, unknown>;

function rows(database: AgentDatabase, sql: string, projectId: string) {
  return database.prepare(sql).all(projectId) as RecordValue[];
}

export function readModuleState(database: AgentDatabase, projectId: string) {
  const preferencesRow = database.prepare("SELECT preferences_json FROM project_preferences WHERE project_id = ?").get(projectId) as { preferences_json: string } | undefined;
  const digest = database.prepare("SELECT * FROM digest_configs WHERE project_id = ?").get(projectId) as RecordValue | undefined;
  const cap = database.prepare("SELECT * FROM usage_caps WHERE project_id = ?").get(projectId) as RecordValue | undefined;
  const preview = database.prepare("SELECT * FROM preview_states WHERE project_id = ?").get(projectId) as RecordValue | undefined;
  const project = database.prepare("SELECT environment FROM projects WHERE id = ?").get(projectId) as { environment: string } | undefined;
  const agents = rows(database, "SELECT id, name, model, status, completed FROM agents WHERE project_id = ?", projectId);
  const tokenRows = rows(database, "SELECT * FROM token_usage WHERE project_id = ?", projectId);
  const totalTokens = tokenRows.reduce((sum, usage) => sum + Number(usage.input_tokens) + Number(usage.output_tokens), 0);
  const inputTokens = tokenRows.reduce((sum, usage) => sum + Number(usage.input_tokens), 0);

  return {
    original: {
      version: 5,
      mail: { sent: Number(database.prepare("SELECT COUNT(*) FROM mail_logs WHERE project_id = ? AND status = 'sent'").pluck().get(projectId)), failed: Number(database.prepare("SELECT COUNT(*) FROM mail_logs WHERE project_id = ? AND status = 'failed'").pluck().get(projectId)), messages: rows(database, "SELECT id, recipient, subject, substr(created_at, 12, 5) AS time, status FROM mail_logs WHERE project_id = ? ORDER BY created_at DESC", projectId) },
      cron: { successfulRuns: 0, jobs: rows(database, "SELECT id, name, schedule, COALESCE(next_run, '') AS nextRun, status FROM cron_jobs WHERE project_id = ?", projectId) },
      plans: { activeTab: "overview", items: rows(database, "SELECT id, name, owner, status FROM plans WHERE project_id = ?", projectId) },
      preview: { state: preview?.state ?? "empty", url: preview?.url ?? "" },
      agents,
      liveProgress: agents.filter((agent) => agent.status === "working").map((agent) => ({ id: `work-${agent.id}`, agent: agent.name, task: "Live backend work", percent: Math.min(99, Number(agent.completed) * 3) })),
      tokens: { totalMillions: totalTokens / 1_000_000, inputPercent: totalTokens ? Math.round(inputTokens / totalTokens * 100) : 0, outputPercent: totalTokens ? Math.round((totalTokens - inputTokens) / totalTokens * 100) : 0, cost: tokenRows.reduce((sum, usage) => sum + Number(usage.cost), 0) },
      apiStatus: rows(database, "SELECT id, provider AS name, COALESCE(latency_ms, 0) AS latency, status FROM api_connections WHERE project_id = ?", projectId),
      github: rows(database, "SELECT id, name, branch, 0 AS openIssues, 0 AS resolvedIssues, 0 AS coverage FROM github_repositories WHERE project_id = ?", projectId),
      chat: rows(database, "SELECT id, CASE sender WHEN 'user' THEN 'me' ELSE 'agent' END AS who, text, substr(created_at, 12, 5) AS time FROM chat_messages WHERE project_id = ? ORDER BY created_at", projectId),
    },
    operational: {
      version: 4,
      notifications: rows(database, "SELECT id, title, detail, substr(created_at, 12, 5) AS time, severity, read FROM notifications WHERE project_id = ? ORDER BY created_at DESC", projectId).map((notification) => ({ ...notification, read: Boolean(notification.read) })),
      preferences: preferencesRow ? JSON.parse(preferencesRow.preferences_json) : { desktopNotifications: false, digestEmail: false, compactDensity: false, liveUpdates: false },
      billing: { monthlyCap: Number(cap?.monthly_cap ?? 0), alertThreshold: Number(cap?.alert_threshold ?? 0) },
      digests: { cadence: digest?.cadence ?? "daily", deliveryTime: digest?.delivery_time ?? "18:00", modules: JSON.parse(String(digest?.modules_json ?? "[]")), history: rows(database, "SELECT id, json_extract(config_json, '$.range') AS title, created_at AS createdAt, 'ready' AS status FROM reports WHERE project_id = ? ORDER BY created_at DESC", projectId) },
      environment: project?.environment ?? "Local",
    },
  };
}

export function writeModuleState(database: AgentDatabase, projectId: string, kind: "original" | "operational", state: RecordValue, userId: string, role: Role) {
  requirePermission(role, "write");
  const timestamp = new Date().toISOString();
  database.transaction(() => {
    if (kind === "original") {
      const original = state as RecordValue & { mail: RecordValue; cron: RecordValue; plans: RecordValue; preview: RecordValue; agents: RecordValue[]; github: RecordValue[]; chat: RecordValue[] };
      replace(database, "mail_logs", projectId, original.mail.messages as RecordValue[], (item) => [item.id, projectId, item.recipient, item.subject, item.status, timestamp]);
      replace(database, "cron_jobs", projectId, original.cron.jobs as RecordValue[], (item) => [item.id, projectId, item.name, item.schedule, item.nextRun, item.status, "general"]);
      replace(database, "plans", projectId, original.plans.items as RecordValue[], (item) => [item.id, projectId, item.name, item.owner, item.status, 1, timestamp]);
      const saveAgent = database.prepare("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,model=excluded.model,status=excluded.status,completed=excluded.completed");
      original.agents.forEach((item) => saveAgent.run(item.id, projectId, item.name, item.model, item.status, item.completed));
      replace(database, "github_repositories", projectId, original.github, (item) => [item.id, projectId, null, item.name, item.name, item.branch, timestamp]);
      replace(database, "chat_messages", projectId, original.chat, (item) => [item.id, projectId, item.who === "me" ? userId : null, item.who === "me" ? "user" : "agent", item.text, timestamp]);
      database.prepare("INSERT INTO preview_states VALUES (?, ?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET state=excluded.state,url=excluded.url,updated_at=excluded.updated_at").run(projectId, original.preview.state, original.preview.url, timestamp);
    } else {
      const operational = state as RecordValue & { notifications: RecordValue[]; preferences: RecordValue; billing: RecordValue; digests: RecordValue; environment: string };
      const previousCap = database.prepare("SELECT monthly_cap, alert_threshold FROM usage_caps WHERE project_id = ?").get(projectId) as { monthly_cap: number; alert_threshold: number } | undefined;
      const previousEnvironment = database.prepare("SELECT environment FROM projects WHERE id = ?").get(projectId) as { environment: string } | undefined;
      replace(database, "notifications", projectId, operational.notifications, (item) => [item.id, projectId, item.title, item.detail, item.severity, Number(item.read), timestamp]);
      database.prepare("INSERT INTO project_preferences VALUES (?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET preferences_json=excluded.preferences_json,updated_at=excluded.updated_at").run(projectId, JSON.stringify(operational.preferences), timestamp);
      database.prepare("INSERT INTO usage_caps VALUES (?, ?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET monthly_cap=excluded.monthly_cap,alert_threshold=excluded.alert_threshold,updated_at=excluded.updated_at").run(projectId, operational.billing.monthlyCap, operational.billing.alertThreshold, timestamp);
      database.prepare("INSERT INTO digest_configs VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET cadence=excluded.cadence,delivery_time=excluded.delivery_time,modules_json=excluded.modules_json,updated_at=excluded.updated_at").run(projectId, operational.digests.cadence, operational.digests.deliveryTime, JSON.stringify(operational.digests.modules), timestamp);
      database.prepare("UPDATE projects SET environment = ?, updated_at = ? WHERE id = ?").run(operational.environment, timestamp, projectId);
      if (!previousCap || previousCap.monthly_cap !== Number(operational.billing.monthlyCap) || previousCap.alert_threshold !== Number(operational.billing.alertThreshold)) audit(database, projectId, userId, "usage-cap.update", "usage_cap", projectId, { monthlyCap: operational.billing.monthlyCap, alertThreshold: operational.billing.alertThreshold });
      if (previousEnvironment?.environment !== operational.environment) audit(database, projectId, userId, "environment.switch", "project", projectId, { from: previousEnvironment?.environment, to: operational.environment });
    }
  })();
}

function replace(database: AgentDatabase, table: string, projectId: string, items: RecordValue[], values: (item: RecordValue) => unknown[]) {
  database.prepare(`DELETE FROM ${table} WHERE project_id = ?`).run(projectId);
  if (!items.length) return;
  const placeholders = values(items[0]).map(() => "?").join(",");
  const insert = database.prepare(`INSERT INTO ${table} VALUES (${placeholders})`);
  items.forEach((item) => insert.run(...values(item)));
}