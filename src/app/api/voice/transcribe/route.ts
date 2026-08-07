import { providerFetch } from "@/server/providers";
import { enforceRateLimit, errorResponse, HttpError, requireBodyWithinLimit, requireSameOrigin, requireSession } from "@/server/policies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = requireSession(request);
    requireSameOrigin(request);
    requireBodyWithinLimit(request, 10 * 1024 * 1024);
    enforceRateLimit(`voice:transcribe:${session.userId}`, 10, 60_000);
    const input = await request.formData();
    const audio = input.get("audio");
    if (!(audio instanceof File) || audio.size === 0) throw new HttpError(400, "No speech audio was received.");
    if (audio.size > 10 * 1024 * 1024) throw new HttpError(413, "Speech audio must not exceed 10 MB.");
    const form = new FormData();
    form.set("file", audio, audio.name || "capture.webm");
    form.set("model", process.env.WHISPER_MODEL ?? "whisper-1");
    const response = await providerFetch("whisper", "/audio/transcriptions", { method: "POST", body: form });
    if (!response.ok) throw new HttpError(502, `Whisper returned ${response.status}.`);
    const result = await response.json() as { text?: string };
    if (!result.text?.trim()) throw new HttpError(422, "No usable speech was detected.");
    return Response.json({ text: result.text.trim() });
  } catch (error) {
    if (error instanceof Error && /not configured/.test(error.message)) return Response.json({ error: error.message }, { status: 503 });
    return errorResponse(error);
  }
}