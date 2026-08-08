import { getDatabase } from "@/server/database";
import { createProjectAssistantReply, type ChatProvider } from "@/server/project-assistant";
import { resolveProjectIntent } from "@/server/project-intent";
import { enforceRateLimit, errorResponse, HttpError, readJson, requireBodyWithinLimit, requireSameOrigin, requireSession } from "@/server/policies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const providers = new Set<ChatProvider>(["hermes", "openai", "openrouter", "groq", "xai"]);

export async function POST(request: Request) {
  try {
    const session = requireSession(request);
    requireSameOrigin(request);
    requireBodyWithinLimit(request, 12_000);
    enforceRateLimit(`project-assistant:${session.userId}`, 60, 60_000);
    const body = await readJson<{ projectId?: string; message?: string; provider?: string }>(request);
    if (!body.projectId) throw new HttpError(400, "A project must be selected.");
    if (!body.message?.trim() || body.message.length > 8_000) throw new HttpError(400, "Message must contain between 1 and 8000 characters.");
    const intent = resolveProjectIntent(getDatabase(), body.message);
    if (intent.type !== "none") return Response.json({ data: { messages: [], proposal: intent } });
    const provider = body.provider && providers.has(body.provider as ChatProvider) ? body.provider as ChatProvider : undefined;
    const data = await createProjectAssistantReply(getDatabase(), { projectId: body.projectId, message: body.message, provider }, session.userId, session.role);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}