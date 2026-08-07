import net from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import nodemailer from "nodemailer";

export type ProviderName = "hermes" | "openai" | "openrouter" | "github" | "groq" | "xai" | "smtp" | "whisper" | "tts";

const runFile = promisify(execFile);

function hermesEnabled() {
  return process.env.HERMES_CLI_ENABLED === "true";
}

function hermesCommand() {
  return process.env.HERMES_CLI_PATH || "hermes";
}

async function runHermes(args: string[], timeout: number) {
  if (!hermesEnabled()) throw new Error("hermes is not configured.");
  return runFile(hermesCommand(), args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024,
    timeout,
    windowsHide: true,
  });
}

export function parseHermesOutput(output: string) {
  return output.replace(/\r?\n\s*session_id:\s*[^\r\n]+\s*$/i, "").trim();
}

export async function completeHermesChat(message: string) {
  const { stdout } = await runHermes([
    "chat", "--safe-mode", "--quiet", "--max-turns", "1", "--source", "tool", "-q", message,
  ], Number(process.env.HERMES_CLI_TIMEOUT_MS ?? 120000));
  const text = parseHermesOutput(stdout);
  if (!text) throw new Error("Hermes returned no response content.");
  return { text, usage: { prompt_tokens: 0, completion_tokens: 0 } };
}

type ProviderConfig = { endpoint: string; key?: string; healthPath: string };

const configurations: Record<Exclude<ProviderName, "smtp" | "hermes">, ProviderConfig> = {
  openai: { endpoint: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1", key: process.env.OPENAI_API_KEY, healthPath: "/models" },
  whisper: { endpoint: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1", key: process.env.OPENAI_API_KEY, healthPath: "/models" },
  tts: { endpoint: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1", key: process.env.OPENAI_API_KEY, healthPath: "/models" },
  openrouter: { endpoint: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1", key: process.env.OPENROUTER_API_KEY, healthPath: "/models" },
  github: { endpoint: process.env.GITHUB_API_URL ?? "https://api.github.com", key: process.env.GITHUB_TOKEN, healthPath: "/rate_limit" },
  groq: { endpoint: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1", key: process.env.GROQ_API_KEY, healthPath: "/models" },
  xai: { endpoint: process.env.XAI_BASE_URL ?? "https://api.x.ai/v1", key: process.env.XAI_API_KEY, healthPath: "/models" },
};

export async function providerFetch(provider: Exclude<ProviderName, "smtp" | "hermes">, pathname: string, init: RequestInit = {}) {
  const config = configurations[provider];
  if (!config.key) throw new Error(`${provider} is not configured.`);
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${config.key}`);
  if (provider === "github") headers.set("accept", "application/vnd.github+json");
  return fetch(`${config.endpoint}${pathname}`, { ...init, headers, signal: AbortSignal.timeout(8000) });
}

function smtpHealth() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host) return Promise.resolve({ provider: "smtp", status: "unconfigured", latencyMs: null });
  const started = Date.now();
  return new Promise<{ provider: string; status: string; latencyMs: number | null }>((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (status: string) => { socket.destroy(); resolve({ provider: "smtp", status, latencyMs: Date.now() - started }); };
    socket.setTimeout(5000, () => finish("unreachable"));
    socket.once("connect", () => finish("connected"));
    socket.once("error", () => finish("unreachable"));
  });
}

export async function checkProviders() {
  const httpChecks = Object.entries(configurations).map(async ([provider, config]) => {
    if (!config.key) return { provider, status: "unconfigured", latencyMs: null };
    const started = Date.now();
    try {
      const response = await providerFetch(provider as Exclude<ProviderName, "smtp" | "hermes">, config.healthPath);
      return { provider, status: response.ok ? "connected" : "degraded", latencyMs: Date.now() - started };
    } catch {
      return { provider, status: "unreachable", latencyMs: Date.now() - started };
    }
  });
  const hermesCheck = !hermesEnabled()
    ? Promise.resolve({ provider: "hermes", status: "unconfigured", latencyMs: null })
    : (async () => {
        const started = Date.now();
        try {
          await runHermes(["--version"], 5000);
          return { provider: "hermes", status: "connected", latencyMs: Date.now() - started };
        } catch {
          return { provider: "hermes", status: "unreachable", latencyMs: Date.now() - started };
        }
      })();
  return Promise.all([hermesCheck, ...httpChecks, smtpHealth()]);
}

export async function sendProviderMail(input: { to: string; subject: string; text?: string }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) throw new Error("smtp is not configured.");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  const result = await transport.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to: input.to, subject: input.subject, text: input.text ?? input.subject });
  return { messageId: result.messageId, accepted: result.accepted.map(String), rejected: result.rejected.map(String) };
}

export async function completeChat(provider: "hermes" | "openai" | "openrouter" | "groq" | "xai", message: string) {
  if (provider === "hermes") return completeHermesChat(message);
  const response = await providerFetch(provider, "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.CHAT_MODEL ?? "gpt-4o-mini", messages: [{ role: "user", content: message }] }),
  });
  if (!response.ok) throw new Error(`${provider} returned ${response.status}.`);
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return { text: result.choices?.[0]?.message?.content ?? "No response content.", usage: result.usage ?? {} };
}