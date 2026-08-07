"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { apiRequest, canWriteApi } from "@/lib/api-client";
import { subscribeRealtimeEvents } from "@/lib/realtime";

export type OperationalModuleState = {
  version: number;
  notifications: Array<{
    id: string;
    title: string;
    detail: string;
    time: string;
    severity: "info" | "success" | "warning";
    read: boolean;
  }>;
  preferences: {
    desktopNotifications: boolean;
    digestEmail: boolean;
    compactDensity: boolean;
    liveUpdates: boolean;
  };
  billing: {
    monthlyCap: number;
    alertThreshold: number;
  };
  digests: {
    cadence: "daily" | "weekly";
    deliveryTime: string;
    modules: string[];
    history: Array<{ id: string; title: string; createdAt: string; status: "ready" | "scheduled" }>;
  };
  environment: "Local" | "Staging" | "Production";
};

export const OPERATIONAL_EVENT = "agent-os-operational-modules-change";
const PROJECT_EVENT = "agent-os-project-change";
const PROJECT_KEY = "agent-os-project";

export const initialOperationalModuleState: OperationalModuleState = {
  version: 1,
  notifications: [
    { id: "notice-1", title: "Original modules completed", detail: "Task 5 validation passed across all twelve routes.", time: "Just now", severity: "success", read: false },
    { id: "notice-2", title: "SMTP provider degraded", detail: "Delivery latency crossed the local warning threshold.", time: "18 min", severity: "warning", read: false },
    { id: "notice-3", title: "Memory bank indexed", detail: "Decision and tracker indexes are synchronized.", time: "42 min", severity: "info", read: true },
  ],
  preferences: {
    desktopNotifications: true,
    digestEmail: false,
    compactDensity: false,
    liveUpdates: true,
  },
  billing: { monthlyCap: 7500, alertThreshold: 80 },
  digests: {
    cadence: "daily",
    deliveryTime: "18:00",
    modules: ["Agents", "Tokens", "GitHub", "Cron"],
    history: [
      { id: "digest-1", title: "Daily project digest", createdAt: "Today, 09:00", status: "ready" },
      { id: "digest-2", title: "Weekly operations summary", createdAt: "Mon, 18:00", status: "scheduled" },
    ],
  },
  environment: "Local",
};

const initialStateJson = JSON.stringify(initialOperationalModuleState);

function subscribe(eventName: string, callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

export function operationalStorageKey(projectId: string) {
  return `agent-os-operational-modules:${projectId}`;
}

function parseState(value: string | null): OperationalModuleState {
  if (!value) return structuredClone(initialOperationalModuleState);
  try {
    return { ...structuredClone(initialOperationalModuleState), ...JSON.parse(value) } as OperationalModuleState;
  } catch {
    return structuredClone(initialOperationalModuleState);
  }
}

function writeState(projectId: string, state: OperationalModuleState) {
  window.localStorage.setItem(operationalStorageKey(projectId), JSON.stringify(state));
  window.dispatchEvent(new Event(OPERATIONAL_EVENT));
}

export function useOperationalModuleStore() {
  const projectId = useSyncExternalStore(
    (callback) => subscribe(PROJECT_EVENT, callback),
    () => window.localStorage.getItem(PROJECT_KEY) ?? "agent-os",
    () => "agent-os",
  );
  const stateJson = useSyncExternalStore(
    (callback) => subscribe(OPERATIONAL_EVENT, callback),
    () => window.localStorage.getItem(operationalStorageKey(projectId)) ?? initialStateJson,
    () => initialStateJson,
  );
  const state = parseState(stateJson);

  const update = useCallback((mutate: (current: OperationalModuleState) => OperationalModuleState) => {
    const key = operationalStorageKey(projectId);
    const current = parseState(window.localStorage.getItem(key));
    const next = mutate(current);
    writeState(projectId, next);
    if (canWriteApi()) void apiRequest(`/api/state?projectId=${projectId}`, { method: "PUT", body: JSON.stringify({ kind: "operational", state: next }) }).catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    void apiRequest<{ operational: OperationalModuleState }>(`/api/state?projectId=${projectId}`)
      .then((result) => writeState(projectId, result.operational))
      .catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    return subscribeRealtimeEvents((event) => {
      if (event.projectId !== projectId || event.channel !== "notifications") return;
      update((current) => current.preferences.liveUpdates ? {
        ...current,
        notifications: current.notifications.map((notification, index) => index === 0 ? { ...notification, time: "Live now" } : notification),
      } : current);
    });
  }, [projectId, update]);

  return { projectId, state, update };
}