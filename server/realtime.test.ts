import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

let processHandle: ChildProcess | null = null;
let directory = "";

afterEach(async () => {
  if (processHandle?.exitCode === null) {
    const closed = new Promise<void>((resolve) => processHandle?.once("close", () => resolve()));
    processHandle.kill();
    await closed;
  }
  processHandle = null;
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

function waitForOutput(child: ChildProcess, text: string) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${text}`)), 5000);
    child.stdout?.on("data", (data) => {
      if (String(data).includes(text)) { clearTimeout(timeout); resolve(); }
    });
    child.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Realtime server exited with ${code}`)); });
  });
}

function connect(url: string, cursor: number) {
  const socket = new WebSocket(url);
  socket.on("open", () => socket.send(JSON.stringify({ type: "subscribe", projectId: "agent-os", channels: ["agent-status", "notifications", "status", "voice"], cursor })));
  return socket;
}

describe("realtime server", () => {
  it("multiplexes channels and reconciles persisted events after reconnect", async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-os-realtime-"));
    const databasePath = path.join(directory, "realtime.db");
    const port = 18000 + Math.floor(Math.random() * 1000);
    processHandle = spawn(process.execPath, [path.join(process.cwd(), "server", "realtime.mjs")], {
      cwd: process.cwd(), env: { ...process.env, AGENT_OS_DATABASE_PATH: databasePath, HERMES_WS_PORT: String(port), HERMES_PUSH_INTERVAL_MS: "50", HERMES_AUTH_TOKEN: "realtime-test-token" }, stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForOutput(processHandle, "realtime server ready");

    const unauthorized = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const unauthorizedStatus = await new Promise<number>((resolve, reject) => {
      unauthorized.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
      unauthorized.once("error", reject);
    });
    expect(unauthorizedStatus).toBe(401);

    const first = connect(`ws://127.0.0.1:${port}/ws?token=realtime-test-token`, 0);
    const received = await new Promise<Array<{ sequence: number; channel: string }>>((resolve, reject) => {
      const events: Array<{ sequence: number; channel: string }> = [];
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for channel batch")), 3000);
      first.on("message", (raw) => {
        events.push(JSON.parse(String(raw)));
        if (new Set(events.map((event) => event.channel)).size === 4) { clearTimeout(timeout); resolve(events); }
      });
    });
    const cursor = Math.max(...received.map((event) => event.sequence));
    first.close();

    await new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const database = new Database(databasePath, { readonly: true });
        const count = Number(database.prepare("SELECT COUNT(*) FROM realtime_events WHERE sequence > ?").pluck().get(cursor));
        database.close();
        if (count >= 4) resolve();
        else if (Date.now() - started > 3000) reject(new Error("No missed events were persisted"));
        else setTimeout(check, 25);
      };
      check();
    });

    const second = connect(`ws://127.0.0.1:${port}/ws?token=realtime-test-token`, cursor);
    const replay = await new Promise<{ type: string; sequence: number }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for reconciliation")), 3000);
      second.once("message", (raw) => { clearTimeout(timeout); resolve(JSON.parse(String(raw))); });
    });
    expect(replay.type).toBe("reconcile");
    expect(replay.sequence).toBeGreaterThan(cursor);
    second.close();
  });
});