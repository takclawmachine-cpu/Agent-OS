export const AUTH_EVENT = "agent-os-auth-change";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer" | "guest";
  authenticatedAt: string;
  onboardingRequired: boolean;
};

export type LoginResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: "invalid-credentials" | "setup-required" | "connection-failure" };

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function authenticate(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!response.ok) {
      const reason = response.status === 401 ? "invalid-credentials" : response.status === 503 ? "setup-required" : "connection-failure";
      return { ok: false, reason };
    }
    const result = await response.json() as { data: AuthSession };
    return { ok: true, session: result.data };
  } catch {
    return { ok: false, reason: "connection-failure" };
  }
}
