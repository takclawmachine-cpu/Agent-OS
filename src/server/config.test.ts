import { describe, expect, it } from "vitest";

import { publicConfigurationStatus, readConfiguration, requireConfiguration } from "@/server/config";

const validEnvironment = {
  AGENT_OS_OWNER_NAME: "Project Owner",
  AGENT_OS_OWNER_EMAIL: "owner@example.com",
  AGENT_OS_OWNER_PASSWORD_HASH: `scrypt:${"a".repeat(32)}:${"b".repeat(128)}`,
  AGENT_OS_SESSION_SECRET: "a-secure-session-secret-with-more-than-32-characters",
  AGENT_OS_DATABASE_PATH: "./data/agent-os.db",
  AGENT_OS_BACKUP_PATH: "./backups",
  OPENAI_API_KEY: "configured",
};

describe("server configuration", () => {
  it("blocks an empty installation and reports only safe field names", () => {
    const status = publicConfigurationStatus({});

    expect(status.ready).toBe(false);
    expect(status.missing).toEqual(expect.arrayContaining([
      "AGENT_OS_OWNER_NAME",
      "AGENT_OS_OWNER_EMAIL",
      "AGENT_OS_OWNER_PASSWORD_HASH",
      "AGENT_OS_SESSION_SECRET",
      "AGENT_OS_DATABASE_PATH",
      "AGENT_OS_BACKUP_PATH",
      "AI_PROVIDER",
    ]));
    expect(JSON.stringify(status)).not.toContain("passwordHash");
  });

  it("accepts core settings and one AI provider without optional integrations", () => {
    const status = readConfiguration(validEnvironment);

    expect(status.ready).toBe(true);
    if (!status.ready) throw new Error("Expected configuration to be ready.");
    expect(status.configuration.owner.email).toBe("owner@example.com");
    expect(status.configuration.databasePath).toMatch(/data[\\/]agent-os\.db$/);
  });

  it("rejects malformed credentials and accepts local Hermes as the AI option", () => {
    expect(() => requireConfiguration({ ...validEnvironment, AGENT_OS_OWNER_PASSWORD_HASH: "plain-text" })).toThrow(/AGENT_OS_OWNER_PASSWORD_HASH/);

    const hermesOnly = { ...validEnvironment, OPENAI_API_KEY: "", HERMES_CLI_ENABLED: "true" };
    expect(readConfiguration(hermesOnly).ready).toBe(true);
  });

  it("accepts legacy dollar-delimited password hashes", () => {
    const legacy = { ...validEnvironment, AGENT_OS_OWNER_PASSWORD_HASH: validEnvironment.AGENT_OS_OWNER_PASSWORD_HASH.replaceAll(":", "$") };

    expect(readConfiguration(legacy).ready).toBe(true);
    expect(readConfiguration({ ...validEnvironment, AGENT_OS_OWNER_PASSWORD_HASH: validEnvironment.AGENT_OS_OWNER_PASSWORD_HASH.replace(":", "$") }).ready).toBe(false);
  });
});