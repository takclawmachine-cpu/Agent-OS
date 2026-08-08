import { timingSafeEqual } from "node:crypto";

import { ownerId, readConfiguration } from "@/server/config";
import { getDatabase, upsertOwner } from "@/server/database";
import { verifyPassword } from "@/server/password";
import { enforceRateLimit, errorResponse, HttpError, readJson, requireBodyWithinLimit, requireSameOrigin } from "@/server/policies";
import { createSessionToken, expiredSessionCookie, sessionCookie, sessionFromRequest } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function matches(value: string, expected: string) {
  const supplied = Buffer.from(value);
  const target = Buffer.from(expected);
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  const owner = getDatabase().prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(session.userId) as { id: string; email: string; name: string; role: "admin" | "editor" | "viewer" | "guest" } | undefined;
  if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
  const onboardingRequired = Number(getDatabase().prepare("SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL").pluck().get()) === 0;
  return Response.json({ data: { userId: owner.id, email: owner.email, name: owner.name, role: owner.role, authenticatedAt: new Date(session.expiresAt - 8 * 60 * 60 * 1_000).toISOString(), onboardingRequired } }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireBodyWithinLimit(request, 4096);
    const client = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim().slice(0, 64) || "direct";
    enforceRateLimit(`auth:login:${client}`, 10, 10 * 60_000);
    const status = readConfiguration();
    if (!status.ready) throw new HttpError(503, "Agent OS setup is incomplete.");
    const body = await readJson<{ email: string; password: string }>(request);
    const emailMatches = matches(body.email?.trim().toLowerCase() ?? "", status.configuration.owner.email);
    const passwordMatches = await verifyPassword(body.password ?? "", status.configuration.owner.passwordHash);
    if (!emailMatches || !passwordMatches) throw new HttpError(401, "Incorrect email or password.");
    const session = {
      userId: ownerId(status.configuration.owner.email),
      email: status.configuration.owner.email,
      name: status.configuration.owner.name,
      role: "admin" as const,
      authenticatedAt: new Date().toISOString(),
      onboardingRequired: Number(getDatabase().prepare("SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL").pluck().get()) === 0,
    };
    upsertOwner(getDatabase(), { id: session.userId, email: session.email, name: session.name });
    const token = createSessionToken(session.userId, session.role);
    return Response.json({ data: session }, { headers: { "set-cookie": sessionCookie(token, new URL(request.url).protocol === "https:") } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json({ data: { signedOut: true } }, { headers: { "set-cookie": expiredSessionCookie(new URL(request.url).protocol === "https:") } });
  } catch (error) {
    return errorResponse(error);
  }
}