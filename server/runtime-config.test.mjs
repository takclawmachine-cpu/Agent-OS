import { describe, expect, it } from "vitest";

import { assertConfigured, configurationIssues } from "./runtime-config.mjs";

const valid = {
  AGENT_OS_OWNER_NAME: "Project Owner",
  AGENT_OS_OWNER_EMAIL: "owner@example.com",
  AGENT_OS_OWNER_PASSWORD_HASH: `scrypt$${"a".repeat(32)}$${"b".repeat(128)}`,
  AGENT_OS_SESSION_SECRET: "a-secure-session-secret-with-more-than-32-characters",
  AGENT_OS_DATABASE_PATH: "./data/agent-os.db",
  AGENT_OS_BACKUP_PATH: "./backups",
  OPENAI_API_KEY: "configured",
};

describe("companion runtime configuration", () => {
  it("reports safe missing field names", () => {
    expect(configurationIssues({})).toEqual(expect.arrayContaining(["AGENT_OS_OWNER_EMAIL", "AGENT_OS_OWNER_PASSWORD_HASH", "AI_PROVIDER"]));
  });

  it("accepts one hosted provider or local Hermes", () => {
    expect(configurationIssues(valid)).toEqual([]);
    expect(configurationIssues({ ...valid, OPENAI_API_KEY: "", HERMES_CLI_ENABLED: "true" })).toEqual([]);
    expect(() => assertConfigured(valid)).not.toThrow();
  });
});