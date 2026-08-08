"use client";

import { useEffect, useSyncExternalStore } from "react";

import { useReliability } from "@/components/reliability-provider";
import {
  getRealtimeStatus,
  getServerRealtimeStatus,
  publishRealtimeEvent,
  type RealtimeChannel,
  type RealtimeEvent,
  subscribeRealtimeStatus,
  updateRealtimeStatus,
} from "@/lib/realtime";

const PROJECT_EVENT = "agent-os-project-change";
const PROJECT_KEY = "agent-os-project";
const SOCKET_UNAVAILABLE_KEY = "agent-os-websocket-unavailable";
const LAST_PUSH_KEY = "agent-os-realtime-last-push";
const CURSOR_KEY = "agent-os-realtime-cursor";
const configuredPushInterval = Number(process.env.NEXT_PUBLIC_HERMES_RECONNECT_MS);
const configuredPollInterval = Number(process.env.NEXT_PUBLIC_HERMES_POLL_INTERVAL_MS);
const PUSH_INTERVAL = Number.isFinite(configuredPushInterval) && configuredPushInterval > 0 ? configuredPushInterval : 5000;
const POLL_INTERVAL = Number.isFinite(configuredPollInterval) && configuredPollInterval > 0 ? configuredPollInterval : 7000;
const channels: RealtimeChannel[] = ["agent-status", "notifications", "status", "voice"];
const backendMode = process.env.NEXT_PUBLIC_REALTIME_MODE === "websocket";

function receiveBackendEvent(event: RealtimeEvent) {
  publishRealtimeEvent({ ...event, payload: typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload });
  const previous = getRealtimeStatus();
  updateRealtimeStatus({ ...previous, connected: true, lastSequence: Math.max(previous.lastSequence, event.sequence), reconciledAt: event.type === "reconcile" ? event.occurredAt : previous.reconciledAt });
  window.localStorage.setItem(LAST_PUSH_KEY, event.occurredAt);
  window.localStorage.setItem(`${CURSOR_KEY}:${event.projectId}`, String(event.sequence));
}

function startBackendTransport() {
  let socket: WebSocket | null = null;
  let pollTimer: number | null = null;
  let reconnectTimer: number | null = null;
  let disposed = false;
  const projectId = () => window.localStorage.getItem(PROJECT_KEY) ?? "";
  const persistedCursor = projectId() ? Number(window.localStorage.getItem(`${CURSOR_KEY}:${projectId()}`) ?? 0) : 0;
  if (persistedCursor > getRealtimeStatus().lastSequence) updateRealtimeStatus({ ...getRealtimeStatus(), lastSequence: persistedCursor });
  const poll = async () => {
    if (!projectId()) {
      updateRealtimeStatus({ ...getRealtimeStatus(), mode: "polling", connected: false });
      return;
    }
    try {
      const cursor = getRealtimeStatus().lastSequence;
      const response = await fetch(`/api/realtime?projectId=${projectId()}&cursor=${cursor}`);
      if (!response.ok) throw new Error("Polling unavailable");
      const result = await response.json() as { data: RealtimeEvent[] };
      result.data.forEach((event) => receiveBackendEvent({ ...event, type: "reconcile" }));
      updateRealtimeStatus({ ...getRealtimeStatus(), mode: "polling", connected: true });
    } catch {
      updateRealtimeStatus({ ...getRealtimeStatus(), mode: "polling", connected: false });
    }
  };
  const startPolling = () => {
    if (pollTimer !== null) return;
    void poll();
    pollTimer = window.setInterval(() => void poll(), POLL_INTERVAL);
  };
  const subscribe = () => {
    if (projectId()) socket?.send(JSON.stringify({ type: "subscribe", projectId: projectId(), channels, cursor: getRealtimeStatus().lastSequence }));
  };
  const connect = () => {
    if (disposed || window.localStorage.getItem(SOCKET_UNAVAILABLE_KEY) === "true") { startPolling(); return; }
    socket = new WebSocket(process.env.NEXT_PUBLIC_HERMES_WS_URL ?? "ws://127.0.0.1:8787/ws");
    socket.addEventListener("open", () => {
      if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; }
      updateRealtimeStatus({ ...getRealtimeStatus(), mode: "websocket", connected: true });
      subscribe();
    });
    socket.addEventListener("message", (message) => {
      const event = JSON.parse(String(message.data)) as RealtimeEvent;
      if (event.id) receiveBackendEvent(event);
    });
    socket.addEventListener("close", () => {
      if (disposed) return;
      startPolling();
      reconnectTimer = window.setTimeout(connect, PUSH_INTERVAL);
    });
    socket.addEventListener("error", () => socket?.close());
  };
  window.addEventListener(PROJECT_EVENT, subscribe);
  connect();
  return () => {
    disposed = true;
    socket?.close();
    if (pollTimer !== null) window.clearInterval(pollTimer);
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    window.removeEventListener(PROJECT_EVENT, subscribe);
  };
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { online } = useReliability();

  useEffect(() => {
    if (!online) {
      updateRealtimeStatus({ ...getRealtimeStatus(), mode: "offline", connected: false });
      return;
    }

    if (backendMode) return startBackendTransport();

    updateRealtimeStatus({ ...getRealtimeStatus(), mode: "offline", connected: false });
  }, [online]);

  return children;
}

export function useRealtimeStatus() {
  return useSyncExternalStore(subscribeRealtimeStatus, getRealtimeStatus, getServerRealtimeStatus);
}