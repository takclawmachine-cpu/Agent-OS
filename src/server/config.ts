import { createHash } from "node:crypto";

type Environment = Readonly<Record<string, string | undefined>>;

export type ConfigurationIssue = {
  field: string;
  message: string;
};

export type AppConfiguration = {
  owner: {
    name: string;
    email: string;
    passwordHash: string;
  };
  sessionSecret: string;
  databasePath: string;
  backupPath: string;
};

export type ConfigurationStatus =
  | { ready: true; configuration: AppConfiguration; issues: [] }
  | { ready: false; configuration: null; issues: ConfigurationIssue[] };

const PASSWORD_HASH_PATTERN = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function value(environment: Environment, name: string) {
  return environment[name]?.trim() ?? "";
}

function configuredAiProviders(environment: Environment) {
  return [
    value(environment, "OPENAI_API_KEY"),
    value(environment, "OPENROUTER_API_KEY"),
    value(environment, "GROQ_API_KEY"),
    value(environment, "XAI_API_KEY"),
    value(environment, "HERMES_CLI_ENABLED") === "true" ? "hermes" : "",
  ].filter(Boolean);
}

export function readConfiguration(environment: Environment = process.env): ConfigurationStatus {
  const issues: ConfigurationIssue[] = [];
  const ownerName = value(environment, "AGENT_OS_OWNER_NAME");
  const ownerEmail = value(environment, "AGENT_OS_OWNER_EMAIL").toLowerCase();
  const passwordHash = value(environment, "AGENT_OS_OWNER_PASSWORD_HASH");
  const sessionSecret = value(environment, "AGENT_OS_SESSION_SECRET");
  const databasePath = value(environment, "AGENT_OS_DATABASE_PATH");
  const backupPath = value(environment, "AGENT_OS_BACKUP_PATH");

  if (ownerName.length < 2) issues.push({ field: "AGENT_OS_OWNER_NAME", message: "Enter the owner's name." });
  if (!EMAIL_PATTERN.test(ownerEmail)) issues.push({ field: "AGENT_OS_OWNER_EMAIL", message: "Enter a valid owner email." });
  if (!PASSWORD_HASH_PATTERN.test(passwordHash)) issues.push({ field: "AGENT_OS_OWNER_PASSWORD_HASH", message: "Generate a secure owner password hash." });
  if (sessionSecret.length < 32) issues.push({ field: "AGENT_OS_SESSION_SECRET", message: "Generate a session secret with at least 32 characters." });
  if (!databasePath) issues.push({ field: "AGENT_OS_DATABASE_PATH", message: "Choose a database location." });
  if (!backupPath) issues.push({ field: "AGENT_OS_BACKUP_PATH", message: "Choose a backup location." });
  if (!configuredAiProviders(environment).length) {
    issues.push({ field: "AI_PROVIDER", message: "Configure at least one AI provider or local Hermes." });
  }

  if (issues.length) return { ready: false, configuration: null, issues };

  return {
    ready: true,
    issues: [],
    configuration: {
      owner: { name: ownerName, email: ownerEmail, passwordHash },
      sessionSecret,
      databasePath,
      backupPath,
    },
  };
}

export function requireConfiguration(environment: Environment = process.env) {
  const status = readConfiguration(environment);
  if (!status.ready) {
    throw new Error(`Agent OS setup is incomplete: ${status.issues.map((issue) => issue.field).join(", ")}`);
  }
  return status.configuration;
}

export function publicConfigurationStatus(environment: Environment = process.env) {
  const status = readConfiguration(environment);
  return status.ready
    ? { ready: true, missing: [] as string[] }
    : { ready: false, missing: status.issues.map((issue) => issue.field) };
}

export function ownerId(email: string) {
  return `owner-${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24)}`;
}