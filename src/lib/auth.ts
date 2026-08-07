export const AUTH_SESSION_KEY = "agent-os-session";
export const AUTH_EVENT = "agent-os-auth-change";
export const ONBOARDING_KEY = "agent-os-onboarding";
export const ONBOARDING_EVENT = "agent-os-onboarding-change";

export const DEMO_EMAIL = "admin@agentos.demo";
export const DEMO_PASSWORD = "jarvis2026";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer" | "guest";
  authenticatedAt: string;
};

export type LoginResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: "invalid-credentials" | "connection-failure" };

export type OnboardingState = {
  currentStep: number;
  completed: boolean;
  projectName: string;
  hermesMode: "mock" | "websocket";
  hermesUrl: string;
  voiceEnabled: boolean;
};

export const defaultOnboardingState: OnboardingState = {
  currentStep: 0,
  completed: false,
  projectName: "Agent OS",
  hermesMode: "mock",
  hermesUrl: "ws://127.0.0.1:8787/ws",
  voiceEnabled: true,
};

export function parseSession(value: string | null): AuthSession | null {
  if (!value) return null;
  try {
    const session = JSON.parse(value) as Partial<AuthSession>;
    if (session.userId && session.email && session.name && ["admin", "editor", "viewer", "guest"].includes(session.role ?? "") && session.authenticatedAt) {
      return session as AuthSession;
    }
  } catch {
    return null;
  }
  return null;
}

export function readSession(): AuthSession | null {
  return parseSession(window.localStorage.getItem(AUTH_SESSION_KEY));
}

export function writeSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function parseOnboarding(value: string | null): OnboardingState {
  if (!value) return defaultOnboardingState;
  try {
    const state = JSON.parse(value) as Partial<OnboardingState>;
    return {
      ...defaultOnboardingState,
      ...state,
      currentStep: Math.min(Math.max(Number(state.currentStep) || 0, 0), 3),
      completed: state.completed === true,
      hermesMode: state.hermesMode === "websocket" ? "websocket" : "mock",
    };
  } catch {
    return defaultOnboardingState;
  }
}

export function writeOnboarding(state: OnboardingState) {
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(ONBOARDING_EVENT));
}

export async function authenticate(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!response.ok) return { ok: false, reason: response.status === 401 ? "invalid-credentials" : "connection-failure" };
    const result = await response.json() as { data: AuthSession };
    return { ok: true, session: result.data };
  } catch {
    return { ok: false, reason: "connection-failure" };
  }
}
