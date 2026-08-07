"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { apiRequest } from "@/lib/api-client";

export type ToolModuleState = {
  version: number;
  todos: Array<{ id: string; text: string; completed: boolean; linkType: "none" | "plan" | "agent"; linkId: string; version?: number }>;
  skillAssignments: Record<string, string[]>;
  terminal: Array<{ id: string; kind: "command" | "output" | "error"; text: string }>;
};

const PROJECT_EVENT = "agent-os-project-change";
const TOOL_EVENT = "agent-os-tool-modules-change";
const PROJECT_KEY = "agent-os-project";
const skillIds: Record<string, string> = {
  Git: "skill-git", "Next.js": "skill-next", FastAPI: "skill-fastapi", Docker: "skill-docker",
  SQL: "skill-sql", "Prompt Engineering": "skill-prompts", Testing: "skill-testing", Deployment: "skill-deploy",
};

const initialToolModuleState: ToolModuleState = {
  version: 1,
  todos: [
    { id: "todo-1", text: "Review Phase 1 validation", completed: false, linkType: "plan", linkId: "plan-1" },
    { id: "todo-2", text: "Confirm Hermes health", completed: true, linkType: "agent", linkId: "agent-1" },
  ],
  skillAssignments: {
    "agent-1": ["Prompt Engineering", "Deployment"],
    "agent-2": ["Git", "Next.js", "Testing"],
    "agent-3": ["SQL", "FastAPI"],
  },
  terminal: [
    { id: "terminal-1", kind: "output", text: "Agent OS mock shell · commands: help, status, agents, clear" },
    { id: "terminal-2", kind: "output", text: "project:agent-os $ ready" },
  ],
};

const initialJson = JSON.stringify(initialToolModuleState);

function subscribe(eventName: string, callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function key(projectId: string) {
  return `agent-os-tool-modules:${projectId}`;
}

function parse(value: string | null): ToolModuleState {
  if (!value) return structuredClone(initialToolModuleState);
  try {
    return { ...structuredClone(initialToolModuleState), ...JSON.parse(value) } as ToolModuleState;
  } catch {
    return structuredClone(initialToolModuleState);
  }
}

function write(projectId: string, state: ToolModuleState) {
  window.localStorage.setItem(key(projectId), JSON.stringify(state));
  window.dispatchEvent(new Event(TOOL_EVENT));
}

export function useToolModuleStore() {
  const projectId = useSyncExternalStore(
    (callback) => subscribe(PROJECT_EVENT, callback),
    () => window.localStorage.getItem(PROJECT_KEY) ?? "agent-os",
    () => "agent-os",
  );
  const stateJson = useSyncExternalStore(
    (callback) => subscribe(TOOL_EVENT, callback),
    () => window.localStorage.getItem(key(projectId)) ?? initialJson,
    () => initialJson,
  );
  const state = parse(stateJson);
  const update = useCallback((mutate: (current: ToolModuleState) => ToolModuleState) => {
    const storageKey = key(projectId);
    const current = parse(window.localStorage.getItem(storageKey));
    const next = mutate(current);
    write(projectId, next);

    current.todos.filter((todo) => !next.todos.some((candidate) => candidate.id === todo.id)).forEach((todo) => {
      void apiRequest(`/api/todos?projectId=${projectId}`, { method: "DELETE", body: JSON.stringify({ id: todo.id }) });
    });
    next.todos.filter((todo) => !current.todos.some((candidate) => candidate.id === todo.id)).forEach((todo) => {
      void apiRequest(`/api/todos?projectId=${projectId}`, { method: "POST", body: JSON.stringify(todo) });
    });
    next.todos.filter((todo) => current.todos.some((candidate) => candidate.id === todo.id && (candidate.completed !== todo.completed || candidate.text !== todo.text))).forEach((todo) => {
      const previous = current.todos.find((candidate) => candidate.id === todo.id);
      void apiRequest<{ version: number }>(`/api/todos?projectId=${projectId}`, { method: "PATCH", body: JSON.stringify({ id: todo.id, completed: todo.completed, text: todo.text, version: previous?.version ?? 1 }) })
        .then((saved) => {
          const latest = parse(window.localStorage.getItem(storageKey));
          write(projectId, { ...latest, todos: latest.todos.map((item) => item.id === todo.id ? { ...item, version: saved.version } : item) });
        });
    });
    const agents = new Set([...Object.keys(current.skillAssignments), ...Object.keys(next.skillAssignments)]);
    agents.forEach((agentId) => {
      const before = current.skillAssignments[agentId] ?? [];
      const after = next.skillAssignments[agentId] ?? [];
      [...new Set([...before, ...after])].forEach((skill) => {
        if (before.includes(skill) === after.includes(skill) || !skillIds[skill]) return;
        void apiRequest(`/api/skills?projectId=${projectId}`, { method: "POST", body: JSON.stringify({ agentId, skillId: skillIds[skill], assigned: after.includes(skill) }) });
      });
    });
  }, [projectId]);
  useEffect(() => {
    void Promise.all([
      apiRequest<Array<{ id: string; text: string; completed: number; linkType: "none" | "plan" | "agent"; linkId: string; version: number }>>(`/api/todos?projectId=${projectId}`),
      apiRequest<Array<{ name: string; agentIds: string | null }>>(`/api/skills?projectId=${projectId}`),
      apiRequest<Array<{ id: string; command: string; output: string; status: string }>>(`/api/terminal?projectId=${projectId}`),
    ]).then(([todos, skills, commands]) => write(projectId, {
      ...parse(window.localStorage.getItem(key(projectId))),
      todos: todos.map((todo) => ({ ...todo, completed: Boolean(todo.completed) })),
      skillAssignments: skills.reduce<Record<string, string[]>>((assignments, skill) => {
        skill.agentIds?.split(",").forEach((agentId) => { (assignments[agentId] ??= []).push(skill.name); });
        return assignments;
      }, {}),
      terminal: commands.flatMap((command) => [
        { id: `${command.id}-command`, kind: "command" as const, text: `$ ${command.command}` },
        { id: command.id, kind: command.status === "completed" ? "output" as const : "error" as const, text: command.output },
      ]),
    })).catch(() => undefined);
  }, [projectId]);
  return { projectId, state, update };
}