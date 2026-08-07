import { providerFetch } from "@/server/providers";
import { enforceRateLimit, errorResponse, HttpError, readJson, requireBodyWithinLimit, requireSameOrigin, requireSession } from "@/server/policies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = requireSession(request);
    requireSameOrigin(request);
    requireBodyWithinLimit(request, 16 * 1024);
    enforceRateLimit(`voice:tts:${session.userId}`, 20, 60_000);
    const { text } = await readJson<{ text: string }>(request);
    if (!text?.trim() || text.length > 4000) throw new HttpError(400, "TTS text must contain between 1 and 4000 characters.");
    const response = await providerFetch("tts", "/audio/speech", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.TTS_MODEL ?? "gpt-4o-mini-tts", voice: process.env.TTS_VOICE ?? "alloy", input: text.trim() }),
    });
    if (!response.ok) throw new HttpError(502, `TTS provider returned ${response.status}.`);
    return new Response(response.body, { headers: { "content-type": response.headers.get("content-type") ?? "audio/mpeg", "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && /not configured/.test(error.message)) return Response.json({ error: error.message }, { status: 503 });
    return errorResponse(error);
  }
}