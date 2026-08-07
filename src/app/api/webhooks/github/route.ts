import { getDatabase } from "@/server/database";
import { enforceRateLimit, errorResponse, requireBodyWithinLimit } from "@/server/policies";
import { ingestGitHubWebhook } from "@/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireBodyWithinLimit(request, 1024 * 1024);
    const client = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim().slice(0, 64) || "direct";
    enforceRateLimit(`webhook:github:${client}`, 120, 60_000);
    const body = await request.text();
    if (Buffer.byteLength(body) > 1024 * 1024) return Response.json({ error: "Request body is too large." }, { status: 413 });
    return Response.json({ data: ingestGitHubWebhook(getDatabase(), body, request.headers, process.env.GITHUB_WEBHOOK_SECRET ?? "") }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}