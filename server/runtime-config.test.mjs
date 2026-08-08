import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { formatPasswordHash, parsePasswordHash } from "./password-format.mjs";
import { assertConfigured, configurationIssues } from "./runtime-config.mjs";

const valid = {
  AGENT_OS_OWNER_NAME: "Project Owner",
  AGENT_OS_OWNER_EMAIL: "owner@example.com",
  AGENT_OS_OWNER_PASSWORD_HASH: `scrypt:${"a".repeat(32)}:${"b".repeat(128)}`,
  AGENT_OS_SESSION_SECRET: "a-secure-session-secret-with-more-than-32-characters",
  AGENT_OS_DATABASE_PATH: "./data/agent-os.db",
  AGENT_OS_BACKUP_PATH: "./backups",
  OPENAI_API_KEY: "configured",
};

describe("companion runtime configuration", () => {
  it("serializes a parser-neutral hash and parses legacy hashes", () => {
    const encoded = formatPasswordHash("a".repeat(32), "b".repeat(128));

    expect(encoded).toBe(`scrypt:${"a".repeat(32)}:${"b".repeat(128)}`);
    expect(encoded).not.toContain("$");
    expect(parsePasswordHash(encoded.replaceAll(":", "$"))).toEqual({ saltHex: "a".repeat(32), hashHex: "b".repeat(128) });
  });

  it("reports safe missing field names", () => {
    expect(configurationIssues({})).toEqual(expect.arrayContaining(["AGENT_OS_OWNER_EMAIL", "AGENT_OS_OWNER_PASSWORD_HASH", "AI_PROVIDER"]));
  });

  it("accepts one hosted provider or local Hermes", () => {
    expect(configurationIssues(valid)).toEqual([]);
    expect(configurationIssues({ ...valid, OPENAI_API_KEY: "", HERMES_CLI_ENABLED: "true" })).toEqual([]);
    expect(() => assertConfigured(valid)).not.toThrow();
  });

  it("accepts legacy dollar-delimited password hashes", () => {
    const legacy = { ...valid, AGENT_OS_OWNER_PASSWORD_HASH: valid.AGENT_OS_OWNER_PASSWORD_HASH.replaceAll(":", "$") };

    expect(configurationIssues(legacy)).toEqual([]);
    expect(configurationIssues({ ...valid, AGENT_OS_OWNER_PASSWORD_HASH: valid.AGENT_OS_OWNER_PASSWORD_HASH.replace(":", "$") })).toContain("AGENT_OS_OWNER_PASSWORD_HASH");
  });

  it("migrates legacy local hashes and rotates the session secret", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-os-env-"));
    const legacyHash = valid.AGENT_OS_OWNER_PASSWORD_HASH.replaceAll(":", "$");
    const previousSecret = valid.AGENT_OS_SESSION_SECRET;
    fs.writeFileSync(path.join(directory, ".env.local"), Object.entries({ ...valid, AGENT_OS_OWNER_PASSWORD_HASH: legacyHash })
      .map(([name, value]) => `${name}=${value}`).join("\n"));

    try {
      execFileSync(process.execPath, [path.resolve("scripts/setup-env.mjs"), "--migrate"], { cwd: directory });
      const migrated = fs.readFileSync(path.join(directory, ".env.local"), "utf8");

      expect(migrated).toContain(`AGENT_OS_OWNER_PASSWORD_HASH=${valid.AGENT_OS_OWNER_PASSWORD_HASH}`);
      expect(migrated).not.toContain(legacyHash);
      expect(migrated).not.toContain(`AGENT_OS_SESSION_SECRET=${previousSecret}`);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});