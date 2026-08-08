import { publicConfigurationStatus } from "@/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ data: publicConfigurationStatus() }, {
    headers: { "cache-control": "no-store" },
  });
}