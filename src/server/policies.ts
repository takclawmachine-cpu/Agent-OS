import { sessionFromRequest } from "@/server/session";

export type Role = "admin" | "editor" | "viewer" | "guest";
export type Permission = "read" | "write" | "terminal" | "backup" | "restore" | "export" | "delete";

const grants: Record<Role, Permission[]> = {
  admin: ["read", "write", "terminal", "backup", "restore", "export", "delete"],
  editor: ["read", "write", "terminal", "export"],
  viewer: ["read", "export"],
  guest: ["read"],
};

const rateWindows = new Map<string, { count: number; resetsAt: number }>();

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requirePermission(role: Role, permission: Permission) {
  if (!grants[role].includes(permission)) throw new HttpError(403, `${role} cannot perform ${permission} actions.`);
}

export function roleFromRequest(request: Request): Role {
  return sessionFromRequest(request)?.role ?? "guest";
}

export function requireSession(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) throw new HttpError(401, "Authentication required.");
  return session;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() || requestUrl.protocol.slice(0, -1);
  const allowedOrigins = new Set([requestUrl.origin, host ? `${protocol}://${host}` : requestUrl.origin]);
  if (!origin || !allowedOrigins.has(origin)) throw new HttpError(403, "Request origin is not allowed.");
}

export function requireBodyWithinLimit(request: Request, maximumBytes: number) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) throw new HttpError(413, "Request body is too large.");
}

export function enforceRateLimit(key: string, limit: number, windowMilliseconds: number, now = Date.now()) {
  const current = rateWindows.get(key);
  if (!current || current.resetsAt <= now) {
    rateWindows.set(key, { count: 1, resetsAt: now + windowMilliseconds });
    return;
  }
  if (current.count >= limit) throw new HttpError(429, "Too many requests. Try again later.");
  current.count += 1;
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: "Internal server error." }, { status: 500 });
}