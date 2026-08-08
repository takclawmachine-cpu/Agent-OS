import type { AgentDatabase } from "@/server/database";
import { HttpError } from "@/server/policies";
import type { ChatMessage } from "@/server/providers";

const MAX_CONTEXT_CHARACTERS = 12_000;

function stringifyRows(label: string, rows: unknown[]) {
  if (!rows.length) return `${label}: none`;
  return `${label}: ${JSON.stringify(rows)}`;
}

export function buildProjectContext(database: AgentDatabase, projectId: string): { projectName: string; messages: ChatMessage[] } {
  const project = database.prepare("SELECT id, name, environment FROM projects WHERE id = ? AND deleted_at IS NULL").get(projectId) as { id: string; name: string; environment: string } | undefined;
  if (!project) throw new HttpError(404, "Project not found.");

  const agents = database.prepare("SELECT name, model, status, completed FROM agents WHERE project_id = ? ORDER BY name LIMIT 20").all(projectId);
  const tasks = database.prepare("SELECT text, completed, link_type AS linkType FROM tasks WHERE project_id = ? ORDER BY updated_at DESC LIMIT 20").all(projectId);
  const plans = database.prepare("SELECT name, owner, status FROM plans WHERE project_id = ? ORDER BY updated_at DESC LIMIT 12").all(projectId);
  const notifications = database.prepare("SELECT title, detail, severity, read FROM notifications WHERE project_id = ? ORDER BY created_at DESC LIMIT 10").all(projectId);
  const vault = database.prepare("SELECT note_path AS path, content FROM vault_note_versions WHERE project_id = ? AND version = (SELECT MAX(latest.version) FROM vault_note_versions latest WHERE latest.project_id = vault_note_versions.project_id AND latest.note_path = vault_note_versions.note_path) ORDER BY note_path LIMIT 8").all(projectId) as Array<{ path: string; content: string }>;
  const history = database.prepare("SELECT sender, text FROM chat_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT 12").all(projectId) as Array<{ sender: string; text: string }>;

  const sections = [
    `You are the assistant for exactly one Agent OS project. Never claim access to another project.\nProject: ${project.name}\nEnvironment: ${project.environment}`,
    stringifyRows("Agents", agents),
    stringifyRows("Tasks", tasks),
    stringifyRows("Plans", plans),
    stringifyRows("Recent notifications", notifications),
    stringifyRows("Latest vault notes", vault.map((note) => ({ path: note.path, content: note.content.slice(0, 1200) }))),
  ];
  const systemContext = sections.join("\n").slice(0, MAX_CONTEXT_CHARACTERS);
  return {
    projectName: project.name,
    messages: [
      { role: "system", content: systemContext },
      ...history.reverse().map((entry): ChatMessage => ({ role: entry.sender === "user" ? "user" : "assistant", content: entry.text.slice(0, 4000) })),
    ],
  };
}