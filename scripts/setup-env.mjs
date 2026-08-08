import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import fs from "node:fs";
import readline from "node:readline";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";

import { formatPasswordHash, parsePasswordHash } from "../server/password-format.mjs";
import { configurationIssues } from "../server/runtime-config.mjs";

const target = ".env.local";
const scrypt = promisify(scryptCallback);
const force = process.argv.includes("--force");
const migrate = process.argv.includes("--migrate");

if (migrate) {
  if (!fs.existsSync(target)) {
    console.error("No .env.local file exists. Run npm run setup instead.");
    process.exit(1);
  }
  const current = fs.readFileSync(target, "utf8");
  const legacyHash = current.match(/^AGENT_OS_OWNER_PASSWORD_HASH=(scrypt\$[^\r\n]+)$/m)?.[1];
  const parsedHash = legacyHash ? parsePasswordHash(legacyHash) : null;
  if (!parsedHash) {
    console.error("No legacy password hash was found. Run npm run config:check.");
    process.exit(1);
  }
  const migratedHash = formatPasswordHash(parsedHash.saltHex, parsedHash.hashHex);
  const sessionSecret = randomBytes(48).toString("base64url");
  const migrated = current
    .replace(/^AGENT_OS_OWNER_PASSWORD_HASH=.*$/m, `AGENT_OS_OWNER_PASSWORD_HASH=${migratedHash}`)
    .replace(/^AGENT_OS_SESSION_SECRET=.*$/m, `AGENT_OS_SESSION_SECRET=${sessionSecret}`);
  fs.writeFileSync(target, migrated, { encoding: "utf8", mode: 0o600, flag: "w" });
  console.log("Local setup migrated. Existing sessions were invalidated; run npm run config:check.");
  process.exit(0);
}

if (process.argv.includes("--check")) {
  if (fs.existsSync(target)) {
    const localEnvironment = fs.readFileSync(target, "utf8");
    if (/^AGENT_OS_OWNER_PASSWORD_HASH=scrypt\$/m.test(localEnvironment)) {
      console.error("Setup incomplete: AGENT_OS_OWNER_PASSWORD_HASH uses the legacy local-file format. Run npm run setup -- --force.");
      process.exit(1);
    }
    process.loadEnvFile(target);
  }
  const issues = configurationIssues();
  if (issues.length) {
    console.error(`Setup incomplete: ${issues.join(", ")}`);
    process.exit(1);
  }
  console.log("Agent OS configuration is ready.");
  process.exit(0);
}

if (fs.existsSync(target) && !force) {
  console.error(".env.local already exists. Run npm run setup -- --force to replace it.");
  process.exit(1);
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const ownerName = (await prompt.question("Owner name: ")).trim();
const ownerEmail = (await prompt.question("Owner email: ")).trim().toLowerCase();
console.log("AI option: 1) OpenAI  2) OpenRouter  3) Groq  4) xAI  5) Local Hermes");
const providerChoice = (await prompt.question("Choose 1-5: ")).trim();
prompt.close();

async function hiddenQuestion(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") throw new Error("Secure setup requires an interactive terminal.");
  process.stdout.write(label);
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let answer = "";
    const finish = (error) => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(answer);
    };
    const onKeypress = (character, key) => {
      if (key?.ctrl && key.name === "c") return finish(new Error("Setup cancelled."));
      if (key?.name === "return" || key?.name === "enter") return finish();
      if (key?.name === "backspace") {
        if (answer) { answer = answer.slice(0, -1); process.stdout.write("\b \b"); }
        return;
      }
      if (character && !key?.ctrl && !key?.meta) { answer += character; process.stdout.write("*"); }
    };
    process.stdin.on("keypress", onKeypress);
  });
}

const password = await hiddenQuestion("Owner password (minimum 12 characters): ");
const confirmation = await hiddenQuestion("Confirm owner password: ");
if (password !== confirmation) throw new Error("Passwords do not match.");
if (password.length < 12) throw new Error("The owner password must contain at least 12 characters.");

const providerNames = { "1": "OPENAI_API_KEY", "2": "OPENROUTER_API_KEY", "3": "GROQ_API_KEY", "4": "XAI_API_KEY" };
const providerName = providerNames[providerChoice];
if (!providerName && providerChoice !== "5") throw new Error("Choose an AI option from 1 to 5.");
const providerKey = providerName ? await hiddenQuestion(`${providerName}: `) : "";
if (providerName && !providerKey.trim()) throw new Error(`${providerName} cannot be empty.`);

const salt = randomBytes(16);
const derived = await scrypt(password, salt, 64);
const passwordHash = formatPasswordHash(salt.toString("hex"), Buffer.from(derived).toString("hex"));
const sessionSecret = randomBytes(48).toString("base64url");
const keys = { OPENAI_API_KEY: "", OPENROUTER_API_KEY: "", GROQ_API_KEY: "", XAI_API_KEY: "" };
if (providerName) keys[providerName] = providerKey;

const contents = `# Generated by npm run setup. Never commit this file.
AGENT_OS_OWNER_NAME=${ownerName}
AGENT_OS_OWNER_EMAIL=${ownerEmail}
AGENT_OS_OWNER_PASSWORD_HASH=${passwordHash}
AGENT_OS_SESSION_SECRET=${sessionSecret}
AGENT_OS_ENVIRONMENT=Local
AGENT_OS_DATABASE_PATH=./data/agent-os.db
AGENT_OS_BACKUP_PATH=./backups
HERMES_CLI_ENABLED=${providerChoice === "5"}
HERMES_CLI_PATH=hermes
HERMES_CLI_TIMEOUT_MS=120000
OPENAI_API_KEY=${keys.OPENAI_API_KEY}
OPENAI_BASE_URL=https://api.openai.com/v1
OPENROUTER_API_KEY=${keys.OPENROUTER_API_KEY}
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
GROQ_API_KEY=${keys.GROQ_API_KEY}
GROQ_BASE_URL=https://api.groq.com/openai/v1
XAI_API_KEY=${keys.XAI_API_KEY}
XAI_BASE_URL=https://api.x.ai/v1
NEXT_PUBLIC_REALTIME_MODE=websocket
NEXT_PUBLIC_HERMES_WS_URL=ws://127.0.0.1:8787/ws
NEXT_PUBLIC_HERMES_RECONNECT_MS=5000
NEXT_PUBLIC_HERMES_POLL_INTERVAL_MS=7000
HERMES_WS_PORT=8787
`;

const generatedEnvironment = Object.fromEntries(contents.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const separator = line.indexOf("=");
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
const issues = configurationIssues(generatedEnvironment);
if (issues.length) throw new Error(`Setup is incomplete: ${issues.join(", ")}`);

fs.writeFileSync(target, contents, { encoding: "utf8", mode: 0o600, flag: force ? "w" : "wx" });
console.log("Setup complete. Run npm run dev:full, then open http://127.0.0.1:3000/login");