"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { apiRequest, normalizeApiError, type ApiError } from "@/lib/api-client";
import { subscribeRealtimeEvents } from "@/lib/realtime";
import { resolveResourceState, type ProviderStatus, type ResourceMetadata, type ResourceState } from "@/lib/resource-state";

export type Status = "success" | "warning" | "error" | "neutral";

export type OriginalModuleState = {
  version: number;
  mail: {
    sent: number;
    failed: number;
    messages: Array<{ id: string; recipient: string; subject: string; time: string; status: "sent" | "failed" }>;
  };
  cron: {
    jobs: Array<{ id: string; name: string; schedule: string; nextRun: string; status: "active" | "failed" }>;
    successfulRuns: number;
  };
  plans: {
    activeTab: "overview" | "plans" | "history";
    items: Array<{ id: string; name: string; owner: string; status: "in-review" | "approved" | "on-hold" }>;
  };
  preview: { state: "empty" | "loading" | "error" | "populated"; url: string };
  agents: Array<{ id: string; name: string; model: string; status: "working" | "idle"; completed: number }>;
  liveProgress: Array<{ id: string; agent: string; task: string; percent: number }>;
  tokens: { totalMillions: number; inputPercent: number; outputPercent: number; cost: number };
  apiStatus: Array<{ id: string; name: string; latency: number; status: ProviderStatus | "disconnected" }>;
  github: Array<{ id: string; name: string; branch: string; openIssues: number; resolvedIssues: number; coverage: number }>;
  chat: Array<{ id: string; who: "me" | "agent"; text: string; time: string }>;
};

const PROJECT_EVENT = "agent-os-project-change";
const MODULE_EVENT = "agent-os-original-modules-change";
const PROJECT_KEY = "agent-os-project";

export const initialOriginalModuleState: OriginalModuleState = {
  version: 5,
  mail: {
    sent: 0,
    failed: 0,
    messages: [],
  },
  cron: {
    successfulRuns: 0,
    jobs: [],
  },
  plans: {
    activeTab: "overview",
    items: [],
  },
  preview: { state: "empty", url: "http://127.0.0.1:3000/dashboard" },
  agents: [],
  liveProgress: [],
  tokens: { totalMillions: 0, inputPercent: 0, outputPercent: 0, cost: 0 },
  apiStatus: [],
  github: [],
  chat: [],
};

const initialStateJson = JSON.stringify(initialOriginalModuleState);
const apiMetadata: ResourceMetadata = { source: "api", lastSucceededAt: null, retryable: true };

function subscribe(eventName: string, callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function projectStorageKey(projectId: string) {
  return `agent-os-original-modules:${projectId}`;
}

function parseState(value: string | null): OriginalModuleState {
  if (!value) return structuredClone(initialOriginalModuleState);
  try {
    const state = JSON.parse(value) as OriginalModuleState;
    if (state.version === initialOriginalModuleState.version) return state;
    return structuredClone(initialOriginalModuleState);
  } catch {
    return structuredClone(initialOriginalModuleState);
  }
}

function writeState(projectId: string, state: OriginalModuleState) {
  window.localStorage.setItem(projectStorageKey(projectId), JSON.stringify(state));
  window.dispatchEvent(new Event(MODULE_EVENT));
}

export function useOriginalModuleStore() {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [hydrationResult, setHydrationResult] = useState<{ projectId: string; state: ResourceState<OriginalModuleState> }>({
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
    (callback) => subscribe(MODULE_EVENT, callback),
    () => window.localStorage.getItem(projectStorageKey(projectId)) ?? initialStateJson,
    () => initialStateJson,
  );
  const state = parseState(stateJson);
  const hydrationState = hydrationResult.projectId === projectId
    ? hydrationResult.state
    : { status: "loading" as const, metadata: apiMetadata };

  const update = useCallback((mutate: (current: OriginalModuleState) => OriginalModuleState) => {
    if (!projectId) return;
    const key = projectStorageKey(projectId);
    const current = parseState(window.localStorage.getItem(key));
    const next = mutate(current);
    writeState(projectId, next);
    void apiRequest(`/api/state?projectId=${projectId}`, { method: "PUT", body: JSON.stringify({ kind: "original", state: next }) })
      .then(() => setPersistenceError(null))
      .catch((error: unknown) => {
        if (JSON.stringify(parseState(window.localStorage.getItem(key))) === JSON.stringify(next)) writeState(projectId, current);
        setPersistenceError(normalizeApiError(error, "/api/state"));
      });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void apiRequest<{ original: OriginalModuleState }>(`/api/state?projectId=${projectId}`)
      .then((result) => {
        writeState(projectId, result.original);
          setHydrationResult({ projectId, state: resolveResourceState({
            data: result.original,
            isEmpty: (state) => !state.mail.messages.length && !state.cron.jobs.length && !state.plans.items.length && !state.agents.length && !state.apiStatus.length && !state.github.length && !state.chat.length && state.tokens.totalMillions === 0,
            metadata: { ...apiMetadata, lastSucceededAt: new Date().toISOString() },
          }) });
      })
      .catch((error: unknown) => {
        const failure = normalizeApiError(error, "/api/state");
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

  useEffect(() => {
    return subscribeRealtimeEvents((event) => {
      if (event.projectId !== projectId || event.channel !== "agent-status") return;
      const payload = event.payload as { missedTicks?: number };
      const ticks = Math.max(1, payload.missedTicks ?? 1);
      update((current) => ({
        ...current,
        liveProgress: current.liveProgress.map((work) => ({ ...work, percent: work.percent >= 99 ? work.percent : Math.min(99, work.percent + ticks) })),
        tokens: { ...current.tokens, totalMillions: Number((current.tokens.totalMillions + (0.01 * ticks)).toFixed(2)) },
      }));
    });
  }, [projectId, update]);

  const retryHydration = useCallback(() => setRefreshVersion((version) => version + 1), []);

  return { hydrationState, persistenceError, projectId, retryHydration, state, update };
}
