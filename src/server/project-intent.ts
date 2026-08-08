import type { AgentDatabase } from "@/server/database";

export type ProjectIntentMatch = { id: string; name: string; environment: string };
export type ProjectIntent =
  | { type: "none" }
  | { type: "exact"; matches: [ProjectIntentMatch] }
  | { type: "ambiguous"; matches: ProjectIntentMatch[] }
  | { type: "not-found"; query: string; matches: [] };

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function resolveProjectIntent(database: AgentDatabase, message: string): ProjectIntent {
  const command = message.trim().match(/^(?:please\s+)?(?:open|switch\s+to|show)(?:\s+(?:the\s+)?)?(?:project\s+)?(.+?)[.!?]*$/i);
  if (!command?.[1]) return { type: "none" };
  const query = normalize(command[1]);
  const projects = database.prepare("SELECT id, name, environment FROM projects WHERE deleted_at IS NULL ORDER BY name").all() as ProjectIntentMatch[];
  const exact = projects.filter((project) => normalize(project.name) === query);
  if (exact.length === 1) return { type: "exact", matches: [exact[0]] };
  const partial = projects.filter((project) => normalize(project.name).includes(query) || query.includes(normalize(project.name)));
  if (partial.length === 1) return { type: "exact", matches: [partial[0]] };
  if (partial.length > 1) return { type: "ambiguous", matches: partial };
  return { type: "not-found", query: command[1].trim(), matches: [] };
}