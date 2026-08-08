"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";

import { Icon } from "@/components/icon";

const CONNECTIVITY_EVENT = "agent-os-connectivity-change";
const FORCED_OFFLINE_KEY = "agent-os-forced-offline";

type ReliabilityEvent = {
  kind: "error" | "offline" | "reconnected";
  level: "field" | "module" | "app";
  source: string;
  message: string;
};

type ReliabilityContextValue = {
  online: boolean;
  retry: () => void;
  simulateOffline: (source: string) => void;
};

const ReliabilityContext = createContext<ReliabilityContextValue>({
  online: true,
  retry: () => undefined,
  simulateOffline: () => undefined,
});

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  window.addEventListener(CONNECTIVITY_EVENT, callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
    window.removeEventListener(CONNECTIVITY_EVENT, callback);
  };
}

function getSnapshot() {
  return navigator.onLine && window.localStorage.getItem(FORCED_OFFLINE_KEY) !== "true";
}

export function reportReliabilityEvent(event: ReliabilityEvent) {
  void fetch("/api/dev-log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...event, path: window.location.pathname }),
  }).catch(() => undefined);
}

export function isAppOnline() {
  return getSnapshot();
}

export function ReliabilityProvider({ children }: { children: React.ReactNode }) {
  const online = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const previousOnline = useRef<boolean | null>(null);

  useEffect(() => {
    if (previousOnline.current === online) return;
    if (!online) {
      reportReliabilityEvent({ kind: "offline", level: "app", source: "connectivity", message: "Agent OS entered offline mode." });
    } else if (previousOnline.current === false) {
      reportReliabilityEvent({ kind: "reconnected", level: "app", source: "connectivity", message: "Connectivity restored; retrying local workflows." });
    }
    previousOnline.current = online;
  }, [online]);

  useEffect(() => {
    const reconnect = () => {
      window.localStorage.removeItem(FORCED_OFFLINE_KEY);
      window.dispatchEvent(new Event(CONNECTIVITY_EVENT));
    };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, []);

  const retry = () => {
    if (!navigator.onLine) return;
    window.localStorage.removeItem(FORCED_OFFLINE_KEY);
    window.dispatchEvent(new Event(CONNECTIVITY_EVENT));
  };

  const simulateOffline = (source: string) => {
    window.localStorage.setItem(FORCED_OFFLINE_KEY, "true");
    window.localStorage.setItem("agent-os-offline-source", source);
    window.dispatchEvent(new Event(CONNECTIVITY_EVENT));
  };

  return (
    <ReliabilityContext.Provider value={{ online, retry, simulateOffline }}>
      {!online ? (
        <div className="offline-banner" role="alert">
          <Icon name="api" size={18} />
          <span><strong>Agent OS is offline</strong><small>Local changes remain available. Connected workflows retry automatically when service returns.</small></span>
          <button type="button" onClick={retry}>Retry now</button>
        </div>
      ) : null}
      {children}
    </ReliabilityContext.Provider>
  );
}

export function useReliability() {
  return useContext(ReliabilityContext);
}

export function OfflineNotice({ source }: { source: string }) {
  const { online, retry } = useReliability();
  if (online) return null;

  return (
    <div className="module-error module-error--offline" role="status">
      <Icon name="api" />
      <span><strong>{source} is offline</strong><small>This action needs the local backend. It will be available after reconnection.</small></span>
      <button className="secondary-action" type="button" onClick={retry}>Retry connection</button>
    </div>
  );
}
