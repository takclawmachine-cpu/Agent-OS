"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { apiRequest, normalizeApiError, type ApiError } from "@/lib/api-client";
import { resolveResourceState, type ResourceMetadata, type ResourceState } from "@/lib/resource-state";

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
  environment: string;
};

export const OPERATIONAL_EVENT = "agent-os-operational-modules-change";
const PROJECT_EVENT = "agent-os-project-change";
const PROJECT_KEY = "agent-os-project";

export const initialOperationalModuleState: OperationalModuleState = {
  version: 4,
  notifications: [],
  preferences: {
    desktopNotifications: false,
    digestEmail: false,
    compactDensity: false,
    liveUpdates: false,
  },
  billing: { monthlyCap: 0, alertThreshold: 0 },
  digests: {
    cadence: "daily",
    deliveryTime: "18:00",
    modules: [],
    history: [],
  },
  environment: "Local",
};

const initialStateJson = JSON.stringify(initialOperationalModuleState);
const apiMetadata: ResourceMetadata = { source: "api", lastSucceededAt: null, retryable: true };

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
    const state = JSON.parse(value) as OperationalModuleState;
    return state.version === initialOperationalModuleState.version ? state : structuredClone(initialOperationalModuleState);
  } catch {
    return structuredClone(initialOperationalModuleState);
  }
}

function writeState(projectId: string, state: OperationalModuleState) {
  window.localStorage.setItem(operationalStorageKey(projectId), JSON.stringify(state));
  window.dispatchEvent(new Event(OPERATIONAL_EVENT));
}

export function useOperationalModuleStore() {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [hydrationResult, setHydrationResult] = useState<{ projectId: string; state: ResourceState<OperationalModuleState> }>({
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
    (callback) => subscribe(OPERATIONAL_EVENT, callback),
    () => window.localStorage.getItem(operationalStorageKey(projectId)) ?? initialStateJson,
    () => initialStateJson,
  );
  const state = parseState(stateJson);
  const hydrationState = hydrationResult.projectId === projectId
    ? hydrationResult.state
    : { status: "loading" as const, metadata: apiMetadata };

  const update = useCallback((mutate: (current: OperationalModuleState) => OperationalModuleState) => {
    if (!projectId) return;
    const key = operationalStorageKey(projectId);
    const current = parseState(window.localStorage.getItem(key));
    const next = mutate(current);
    writeState(projectId, next);
    void apiRequest(`/api/state?projectId=${projectId}`, { method: "PUT", body: JSON.stringify({ kind: "operational", state: next }) })
      .then(() => setPersistenceError(null))
      .catch((error: unknown) => {
        if (JSON.stringify(parseState(window.localStorage.getItem(key))) === JSON.stringify(next)) writeState(projectId, current);
        setPersistenceError(normalizeApiError(error, "/api/state"));
      });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void apiRequest<{ operational: OperationalModuleState }>(`/api/state?projectId=${projectId}`)
      .then((result) => {
        writeState(projectId, result.operational);
        setHydrationResult({
          projectId,
            state: resolveResourceState({
              data: result.operational,
              isEmpty: (state) => !state.notifications.length && !state.digests.history.length && !state.digests.modules.length && state.billing.monthlyCap === 0 && Object.values(state.preferences).every((enabled) => !enabled),
              metadata: { ...apiMetadata, lastSucceededAt: new Date().toISOString() },
            }),
        });
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

  const retryHydration = useCallback(() => setRefreshVersion((version) => version + 1), []);

  return { hydrationState, persistenceError, projectId, retryHydration, state, update };
}