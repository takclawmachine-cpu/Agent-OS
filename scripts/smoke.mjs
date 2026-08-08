import fs from "node:fs";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseUrl = (process.env.STAGING_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const requireHermes = process.argv.includes("--hermes") || process.env.SMOKE_REQUIRE_HERMES === "true";
const ownerEmail = process.env.AGENT_OS_OWNER_EMAIL;
const ownerPassword = process.env.SMOKE_OWNER_PASSWORD;

if (!ownerEmail || !ownerPassword) throw new Error("Set AGENT_OS_OWNER_EMAIL and temporary SMOKE_OWNER_PASSWORD values before running smoke tests.");

async function request(pathname, init) {
  const headers = new Headers(init?.headers);
  if (sessionCookie) headers.set("cookie", sessionCookie);
  if (init?.method && init.method !== "GET") headers.set("origin", baseUrl);
  const response = await fetch(`${baseUrl}${pathname}`, { ...init, headers });
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}`);
  return response;
}

const login = await fetch(`${baseUrl}/api/auth/session`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
});
if (!login.ok) throw new Error(`Session login returned ${login.status}`);
const sessionCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!sessionCookie) throw new Error("Session login did not set a cookie.");

const pages = [
  "/dashboard", "/mail", "/cron", "/plans", "/browser-preview", "/agents", "/agent-status", "/tokens", "/api-status", "/github", "/chat", "/vault",
  "/notifications", "/search", "/settings", "/onboarding", "/status", "/billing", "/digests", "/environments",
  "/voice", "/todo", "/skills", "/terminal", "/api-explorer", "/reports", "/preview-app",
];
const resources = ["/api/agents", "/api/status", "/api/todos", "/api/skills"];
await Promise.all([...pages, ...resources].map((pathname) => request(pathname)));

if (requireHermes) {
  const status = await request("/api/status?projectId=agent-os", {
    headers: {},
  }).then((response) => response.json());
  const hermes = status.data?.find((provider) => provider.provider === "hermes");
  if (hermes?.status !== "connected") throw new Error(`Hermes is ${hermes?.status ?? "missing"}.`);

  const chat = await request("/api/providers?projectId=agent-os", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "chat", provider: "hermes", message: "Reply with exactly AGENT_OS_HERMES_SMOKE_OK" }),
  }).then((response) => response.json());
  if (chat.data?.text !== "AGENT_OS_HERMES_SMOKE_OK") throw new Error("Hermes returned an unexpected smoke response.");
}

const terminal = await request("/api/terminal?projectId=agent-os", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ command: "rm -rf /", sessionId: "staging-smoke" }),
}).then((response) => response.json());
if (terminal.data?.status !== "denied") throw new Error("Terminal deny list did not block the smoke command.");

const report = await request("/api/reports?projectId=agent-os", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ range: "Smoke", modules: ["Agents", "Cron"] }),
}).then((response) => response.json());
if (!report.data?.snapshot) throw new Error("Report snapshot was not generated.");

console.log(`${requireHermes ? "Hermes and staging" : "Staging"} smoke passed at ${baseUrl}`);