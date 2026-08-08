import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";

import { assertConfigured } from "./runtime-config.mjs";
import { initializeDatabase } from "./database-bootstrap.mjs";

const environmentPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(environmentPath)) process.loadEnvFile?.(environmentPath);
assertConfigured();

const port = Number(process.env.HERMES_WS_PORT ?? 8787);
const databasePath = process.env.AGENT_OS_DATABASE_PATH ?? path.join(process.cwd(), "data", "agent-os.db");
const database = initializeDatabase(databasePath);

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "agent-os-realtime" }));
    return;
  }
  response.writeHead(404).end();
});
const sockets = new WebSocketServer({ noServer: true });

function hasValidSession(request) {
  const secret = process.env.AGENT_OS_SESSION_SECRET;
  const encoded = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("agent-os-session-token="))?.slice("agent-os-session-token=".length);
  if (!secret || secret.length < 32 || !encoded) return false;
  const [payload, suppliedSignature, extra] = decodeURIComponent(encoded).split(".");
  if (!payload || !suppliedSignature || extra) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof session.userId === "string" && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const requiredToken = process.env.HERMES_AUTH_TOKEN;
  const hasServiceToken = Boolean(requiredToken) && url.searchParams.get("token") === requiredToken;
  if (url.pathname !== "/ws" || (!hasServiceToken && !hasValidSession(request))) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, (client) => sockets.emit("connection", client));
});

sockets.on("connection", (socket) => {
  socket.subscription = null;
  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type !== "subscribe" || typeof message.projectId !== "string") return;
      socket.subscription = { projectId: message.projectId, channels: new Set(message.channels ?? []), cursor: Number(message.cursor ?? 0) };
      const missed = database.prepare("SELECT sequence,id,project_id AS projectId,channel,event_type AS type,payload_json AS payload,occurred_at AS occurredAt FROM realtime_events WHERE project_id=? AND sequence>? ORDER BY sequence LIMIT 100").all(message.projectId, socket.subscription.cursor);
      missed.forEach((event) => socket.send(JSON.stringify({ ...event, type: "reconcile", payload: JSON.parse(event.payload) })));
    } catch {
      socket.send(JSON.stringify({ error: "Invalid subscription." }));
    }
  });
});

const channels = ["agent-status", "notifications", "status", "voice"];
setInterval(() => {
  const projects = new Set(database.prepare("SELECT id FROM projects WHERE deleted_at IS NULL").all().map((project) => project.id));
  for (const projectId of projects) {
    for (const channel of channels) {
      const event = { id: randomUUID(), projectId, channel, type: "push", payload: { source: "realtime-server" }, occurredAt: new Date().toISOString() };
      const result = database.prepare("INSERT INTO realtime_events (id,project_id,channel,event_type,payload_json,occurred_at) VALUES (?,?,?,?,?,?)").run(event.id, projectId, channel, event.type, JSON.stringify(event.payload), event.occurredAt);
      const envelope = JSON.stringify({ ...event, sequence: Number(result.lastInsertRowid) });
      sockets.clients.forEach((socket) => { if (socket.readyState === 1 && socket.subscription?.projectId === projectId && socket.subscription.channels.has(channel)) socket.send(envelope); });
    }
  }
}, Number(process.env.HERMES_PUSH_INTERVAL_MS ?? 5000));

server.listen(port, "127.0.0.1", () => console.log(`Agent OS realtime server ready on ws://127.0.0.1:${port}/ws`));

function shutdown() {
  sockets.close();
  server.close(() => { database.close(); process.exit(0); });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);