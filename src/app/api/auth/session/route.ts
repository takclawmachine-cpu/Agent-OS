import { timingSafeEqual } from "node:crypto";

import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/auth";
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
  return Response.json({ data: session });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireBodyWithinLimit(request, 4096);
    const client = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim().slice(0, 64) || "direct";
    enforceRateLimit(`auth:login:${client}`, 10, 10 * 60_000);
    const body = await readJson<{ email: string; password: string }>(request);
    if (!matches(body.email?.toLowerCase() ?? "", DEMO_EMAIL) || !matches(body.password ?? "", DEMO_PASSWORD)) throw new HttpError(401, "Incorrect email or password.");
    const session = { userId: "demo-admin", email: DEMO_EMAIL, name: "Harsh Malik", role: "admin" as const, authenticatedAt: new Date().toISOString() };
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