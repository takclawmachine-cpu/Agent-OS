"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { apiRequest, canWriteApi } from "@/lib/api-client";
import { subscribeRealtimeEvents } from "@/lib/realtime";

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
  apiStatus: Array<{ id: string; name: string; latency: number; status: "connected" | "degraded" | "disconnected" | "unconfigured" }>;
  github: Array<{ id: string; name: string; branch: string; openIssues: number; resolvedIssues: number; coverage: number }>;
  chat: Array<{ id: string; who: "me" | "agent"; text: string; time: string }>;
};

const PROJECT_EVENT = "agent-os-project-change";
const MODULE_EVENT = "agent-os-original-modules-change";
const PROJECT_KEY = "agent-os-project";

export const initialOriginalModuleState: OriginalModuleState = {
  version: 2,
  mail: {
    sent: 1248,
    failed: 18,
    messages: [
      { id: "mail-1", recipient: "engineering@agragami.org", subject: "Phase 1 build summary", time: "09:42", status: "sent" },
      { id: "mail-2", recipient: "ops@agragami.org", subject: "Hermes health report", time: "08:16", status: "failed" },
    ],
  },
  cron: {
    successfulRuns: 120,
    jobs: [
      { id: "cron-1", name: "Memory bank index", schedule: "*/30 * * * *", nextRun: "In 12 min", status: "active" },
      { id: "cron-2", name: "Hermes health check", schedule: "*/5 * * * *", nextRun: "In 3 min", status: "active" },
      { id: "cron-3", name: "Daily project digest", schedule: "0 18 * * *", nextRun: "18:00", status: "failed" },
    ],
  },
  plans: {
    activeTab: "overview",
    items: [
      { id: "plan-1", name: "Phase 1 interface foundation", owner: "Hermes", status: "approved" },
      { id: "plan-2", name: "Original module wiring", owner: "Frontend Agent", status: "approved" },
      { id: "plan-3", name: "Local provider integration", owner: "Systems Agent", status: "on-hold" },
    ],
  },
  preview: { state: "empty", url: "http://127.0.0.1:3000/dashboard" },
  agents: [
    { id: "agent-1", name: "Hermes", model: "Orchestrator", status: "working", completed: 28 },
    { id: "agent-2", name: "Frontend Agent", model: "GPT-5.3-Codex", status: "working", completed: 12 },
    { id: "agent-3", name: "Research Agent", model: "GPT-5.3", status: "idle", completed: 8 },
  ],
  liveProgress: [
    { id: "work-1", agent: "Hermes", task: "Coordinate Phase 1", percent: 87 },
    { id: "work-2", agent: "Frontend Agent", task: "Original modules complete", percent: 100 },
    { id: "work-3", agent: "Research Agent", task: "Validate module contracts", percent: 72 },
  ],
  tokens: { totalMillions: 12.48, inputPercent: 60, outputPercent: 40, cost: 4892.65 },
  apiStatus: [
    { id: "api-1", name: "OpenAI", latency: 121, status: "connected" },
    { id: "api-2", name: "GitHub", latency: 184, status: "connected" },
    { id: "api-3", name: "SMTP", latency: 342, status: "degraded" },
    { id: "api-4", name: "Hermes", latency: 0, status: "disconnected" },
  ],
  github: [
    { id: "repo-1", name: "agent-os", branch: "main", openIssues: 4, resolvedIssues: 31, coverage: 82 },
    { id: "repo-2", name: "hermes-bridge", branch: "develop", openIssues: 7, resolvedIssues: 18, coverage: 68 },
  ],
  chat: [
    { id: "chat-1", who: "agent", text: "Project context loaded. What should we move next?", time: "09:41" },
    { id: "chat-2", who: "me", text: "Continue Phase 1 in sequence.", time: "09:42" },
    { id: "chat-3", who: "agent", text: "Task 5 is complete. All original modules are wired.", time: "09:42" },
  ],
};

const initialStateJson = JSON.stringify(initialOriginalModuleState);

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

    return {
      ...state,
      version: initialOriginalModuleState.version,
      plans: {
        ...state.plans,
        items: state.plans.items.map((plan) => plan.id === "plan-2" && plan.status === "in-review" ? { ...plan, status: "approved" } : plan),
      },
      liveProgress: state.liveProgress.map((work) => work.id === "work-2" && work.task === "Wire original modules" ? { ...work, task: "Original modules complete", percent: 100 } : work),
      chat: state.chat.map((message) => message.id === "chat-3" && message.text === "Task 5 is active. Original module contracts are ready." ? { ...message, text: "Task 5 is complete. All original modules are wired." } : message),
    };
  } catch {
    return structuredClone(initialOriginalModuleState);
  }
}

function writeState(projectId: string, state: OriginalModuleState) {
  window.localStorage.setItem(projectStorageKey(projectId), JSON.stringify(state));
  window.dispatchEvent(new Event(MODULE_EVENT));
}

export function useOriginalModuleStore() {
  const projectId = useSyncExternalStore(
    (callback) => subscribe(PROJECT_EVENT, callback),
    () => window.localStorage.getItem(PROJECT_KEY) ?? "agent-os",
    () => "agent-os",
  );
  const stateJson = useSyncExternalStore(
    (callback) => subscribe(MODULE_EVENT, callback),
    () => window.localStorage.getItem(projectStorageKey(projectId)) ?? initialStateJson,
    () => initialStateJson,
  );
  const state = parseState(stateJson);

  const update = useCallback((mutate: (current: OriginalModuleState) => OriginalModuleState) => {
    const key = projectStorageKey(projectId);
    const current = parseState(window.localStorage.getItem(key));
    const next = mutate(current);
    writeState(projectId, next);
    if (canWriteApi()) void apiRequest(`/api/state?projectId=${projectId}`, { method: "PUT", body: JSON.stringify({ kind: "original", state: next }) }).catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    void apiRequest(`/api/status?projectId=${projectId}`)
      .catch(() => undefined)
      .then(() => apiRequest<{ original: OriginalModuleState }>(`/api/state?projectId=${projectId}`))
      .then((result) => writeState(projectId, result.original))
      .catch(() => undefined);
  }, [projectId]);

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

  return { projectId, state, update };
}
