import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "agent-os-session-token";
const SESSION_SECONDS = 8 * 60 * 60;
type SessionRole = "admin" | "editor" | "viewer" | "guest";

export type ServerSession = {
  userId: string;
  role: SessionRole;
  expiresAt: number;
};

function secret() {
  const value = process.env.AGENT_OS_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("AGENT_OS_SESSION_SECRET must contain at least 32 characters.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, role: SessionRole, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId, role, expiresAt: now + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): ServerSession | null {
  if (!token) return null;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ServerSession;
    if (!session.userId || !["admin", "editor", "viewer", "guest"].includes(session.role) || session.expiresAt <= now) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionFromRequest(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return verifySessionToken(token ? decodeURIComponent(token) : undefined);
}

export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_SECONDS}; SameSite=Strict${secure ? "; Secure" : ""}`;
}

export function expiredSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secure ? "; Secure" : ""}`;
}