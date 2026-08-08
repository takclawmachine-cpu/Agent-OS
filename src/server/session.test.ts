import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken, verifySessionToken } from "@/server/session";

describe("server sessions", () => {
  beforeEach(() => vi.stubEnv("AGENT_OS_SESSION_SECRET", "test-session-secret-that-is-at-least-32-characters"));
  afterEach(() => vi.unstubAllEnvs());

  it("verifies an untampered, unexpired session", () => {
    const token = createSessionToken("user-1", "admin", 1_000);
    expect(verifySessionToken(token, 2_000)).toMatchObject({ userId: "user-1", role: "admin" });
  });

  it("rejects tampered and expired sessions", () => {
    const token = createSessionToken("user-1", "editor", 1_000);
    expect(verifySessionToken(`${token.slice(0, -1)}x`, 2_000)).toBeNull();
    expect(verifySessionToken(token, 8 * 60 * 60 * 1_000 + 1_001)).toBeNull();
  });
});