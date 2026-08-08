export const REALTIME_EVENT = "agent-os-realtime-event";
export const REALTIME_STATUS_EVENT = "agent-os-realtime-status-change";

export type RealtimeChannel = "agent-status" | "notifications" | "status" | "voice";
export type RealtimeMode = "websocket" | "polling" | "offline";
export type RealtimeEventType = "push" | "snapshot" | "reconcile";

export type RealtimeEvent<TPayload = unknown> = {
  id: string;
  sequence: number;
  projectId: string;
  channel: RealtimeChannel;
  type: RealtimeEventType;
  occurredAt: string;
  payload: TPayload;
};

export type RealtimeStatus = {
  mode: RealtimeMode;
  connected: boolean;
  lastSequence: number;
  reconciledAt: string | null;
};

const defaultStatus: RealtimeStatus = {
  mode: "websocket",
  connected: true,
  lastSequence: 0,
  reconciledAt: null,
};

let currentStatus = defaultStatus;

export function getRealtimeStatus() {
  return currentStatus;
}

export function getServerRealtimeStatus() {
  return defaultStatus;
}

export function updateRealtimeStatus(status: RealtimeStatus) {
  currentStatus = status;
  window.dispatchEvent(new Event(REALTIME_STATUS_EVENT));
}

export function subscribeRealtimeStatus(listener: () => void) {
  window.addEventListener(REALTIME_STATUS_EVENT, listener);
  return () => window.removeEventListener(REALTIME_STATUS_EVENT, listener);
}

export function publishRealtimeEvent(event: RealtimeEvent) {
  window.dispatchEvent(new CustomEvent<RealtimeEvent>(REALTIME_EVENT, { detail: event }));
}

export function subscribeRealtimeEvents(listener: (event: RealtimeEvent) => void) {
  const receive = (event: Event) => listener((event as CustomEvent<RealtimeEvent>).detail);
  window.addEventListener(REALTIME_EVENT, receive);
  return () => window.removeEventListener(REALTIME_EVENT, receive);
}