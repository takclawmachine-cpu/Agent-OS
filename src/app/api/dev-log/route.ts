import { appendFile, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { errorResponse, requireBodyWithinLimit, requireSameOrigin } from "@/server/policies";

export const runtime = "nodejs";

const validKinds = new Set(["error", "offline", "reconnected"]);
const validLevels = new Set(["field", "module", "app"]);
const maximumLogBytes = 5 * 1024 * 1024;

async function rotateLogs(directory: string, location: string) {
  try {
    if ((await stat(location)).size >= maximumLogBytes) await rename(location, join(directory, `reliability-${Date.now()}.jsonl`));
  } catch {
    // The active log does not exist yet.
  }
  const cutoff = Date.now() - 14 * 86_400_000;
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.filter((entry) => entry.isFile() && /^reliability-\d+\.jsonl$/.test(entry.name) && Number(entry.name.match(/\d+/)?.[0]) < cutoff).map((entry) => rm(join(directory, entry.name), { force: true })));
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ logged: false }, { status: 403 });
  }

  try {
    requireSameOrigin(request);
    requireBodyWithinLimit(request, 4096);
    const body = await request.json() as Record<string, unknown>;
    if (!validKinds.has(String(body.kind)) || !validLevels.has(String(body.level))) {
      return Response.json({ logged: false, error: "Invalid reliability event" }, { status: 400 });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      kind: String(body.kind),
      level: String(body.level),
      source: String(body.source ?? "unknown").slice(0, 80),
      message: String(body.message ?? "").slice(0, 500),
      path: String(body.path ?? "").slice(0, 200),
    };
    const directory = join(process.cwd(), "memory_bank", "logs");
    await mkdir(directory, { recursive: true });
    const location = join(directory, "reliability.jsonl");
    await rotateLogs(directory, location);
    await appendFile(location, `${JSON.stringify(entry)}\n`, "utf8");
    return Response.json({ logged: true });
  } catch (error) {
    return errorResponse(error);
  }
}
