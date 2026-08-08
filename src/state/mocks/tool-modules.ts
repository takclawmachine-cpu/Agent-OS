"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { apiRequest, normalizeApiError, type ApiError } from "@/lib/api-client";
import { resolveResourceState, type ResourceMetadata, type ResourceState } from "@/lib/resource-state";

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
  version: 3,
  todos: [],
  skillAssignments: {},
  terminal: [],
};

const initialJson = JSON.stringify(initialToolModuleState);
const apiMetadata: ResourceMetadata = { source: "api", lastSucceededAt: null, retryable: true };

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
    const state = JSON.parse(value) as ToolModuleState;
    return state.version === initialToolModuleState.version ? state : structuredClone(initialToolModuleState);
  } catch {
    return structuredClone(initialToolModuleState);
  }
}

function write(projectId: string, state: ToolModuleState) {
  window.localStorage.setItem(key(projectId), JSON.stringify(state));
  window.dispatchEvent(new Event(TOOL_EVENT));
}

export function useToolModuleStore() {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [hydrationResult, setHydrationResult] = useState<{ projectId: string; state: ResourceState<ToolModuleState> }>({
    projectId: "",
    state: { status: "loading", metadata: apiMetadata },
  });
  const [persistenceError, setPersistenceError] = useState<ApiError | null>(null);
  const projectId = useSyncExternalStore(
    (callback) => subscribe(PROJECT_EVENT, callback),
    () => window.localStorage.getItem(PROJECT_KEY) ?? "",
    () => "",
  );
  const stateJson = useSyncExternalStore(
    (callback) => subscribe(TOOL_EVENT, callback),
    () => window.localStorage.getItem(key(projectId)) ?? initialJson,
    () => initialJson,
  );
  const state = parse(stateJson);
  const hydrationState = hydrationResult.projectId === projectId
    ? hydrationResult.state
    : { status: "loading" as const, metadata: apiMetadata };
  const trackPersistence = useCallback(<T,>(request: Promise<T>, rollback: () => void) => {
    void request
      .then(() => setPersistenceError(null))
      .catch((error: unknown) => {
        rollback();
        setPersistenceError(normalizeApiError(error));
      });
  }, []);
  const update = useCallback((mutate: (current: ToolModuleState) => ToolModuleState) => {
    if (!projectId) return;
    const storageKey = key(projectId);
    const current = parse(window.localStorage.getItem(storageKey));
    const next = mutate(current);
    write(projectId, next);
    const rollback = () => {
      if (JSON.stringify(parse(window.localStorage.getItem(storageKey))) === JSON.stringify(next)) write(projectId, current);
    };

    current.todos.filter((todo) => !next.todos.some((candidate) => candidate.id === todo.id)).forEach((todo) => {
      trackPersistence(apiRequest(`/api/todos?projectId=${projectId}`, { method: "DELETE", body: JSON.stringify({ id: todo.id }) }), rollback);
    });
    next.todos.filter((todo) => !current.todos.some((candidate) => candidate.id === todo.id)).forEach((todo) => {
      trackPersistence(apiRequest(`/api/todos?projectId=${projectId}`, { method: "POST", body: JSON.stringify(todo) }), rollback);
    });
    next.todos.filter((todo) => current.todos.some((candidate) => candidate.id === todo.id && (candidate.completed !== todo.completed || candidate.text !== todo.text))).forEach((todo) => {
      const previous = current.todos.find((candidate) => candidate.id === todo.id);
      trackPersistence(apiRequest<{ version: number }>(`/api/todos?projectId=${projectId}`, { method: "PATCH", body: JSON.stringify({ id: todo.id, completed: todo.completed, text: todo.text, version: previous?.version ?? 1 }) })
        .then((saved) => {
          const latest = parse(window.localStorage.getItem(storageKey));
          write(projectId, { ...latest, todos: latest.todos.map((item) => item.id === todo.id ? { ...item, version: saved.version } : item) });
        }), rollback);
    });
    const agents = new Set([...Object.keys(current.skillAssignments), ...Object.keys(next.skillAssignments)]);
    agents.forEach((agentId) => {
      const before = current.skillAssignments[agentId] ?? [];
      const after = next.skillAssignments[agentId] ?? [];
      [...new Set([...before, ...after])].forEach((skill) => {
        if (before.includes(skill) === after.includes(skill) || !skillIds[skill]) return;
        trackPersistence(apiRequest(`/api/skills?projectId=${projectId}`, { method: "POST", body: JSON.stringify({ agentId, skillId: skillIds[skill], assigned: after.includes(skill) }) }), rollback);
      });
    });
  }, [projectId, trackPersistence]);
  useEffect(() => {
    if (!projectId) return;
    void Promise.all([
      apiRequest<Array<{ id: string; text: string; completed: number; linkType: "none" | "plan" | "agent"; linkId: string; version: number }>>(`/api/todos?projectId=${projectId}`),
      apiRequest<Array<{ name: string; agentIds: string | null }>>(`/api/skills?projectId=${projectId}`),
      apiRequest<Array<{ id: string; command: string; output: string; status: string }>>(`/api/terminal?projectId=${projectId}`),
    ]).then(([todos, skills, commands]) => {
      const next: ToolModuleState = {
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
      };
      write(projectId, next);
      setHydrationResult({
        projectId,
        state: resolveResourceState({
          data: next,
          isEmpty: (state) => !state.todos.length && !state.terminal.length && !Object.keys(state.skillAssignments).length,
          metadata: { ...apiMetadata, lastSucceededAt: new Date().toISOString() },
        }),
      });
    }).catch((error: unknown) => {
      const failure = normalizeApiError(error);
      setHydrationResult({
        projectId,
        state: {
          status: "error",
          error: { code: failure.code, message: failure.message },
          metadata: { ...apiMetadata, retryable: failure.retryable },
        },
      });
    });
  }, [projectId, refreshVersion]);
  const retryHydration = useCallback(() => setRefreshVersion((version) => version + 1), []);

  return { hydrationState, persistenceError, projectId, retryHydration, state, update };
}