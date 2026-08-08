import { describe, expect, it } from "vitest";

import { enforceRateLimit, HttpError, requireBodyWithinLimit, requireSameOrigin } from "@/server/policies";

describe("request security policies", () => {
  it("requires the exact request origin", () => {
    expect(() => requireSameOrigin(new Request("http://localhost/api/test", { headers: { origin: "http://localhost" } }))).not.toThrow();
    expect(() => requireSameOrigin(new Request("http://internal:3000/api/test", { headers: { host: "agent.test", origin: "https://agent.test", "x-forwarded-proto": "https" } }))).not.toThrow();
    expect(() => requireSameOrigin(new Request("http://localhost/api/test", { headers: { origin: "https://attacker.test" } }))).toThrowError(HttpError);
  });

  it("rejects declared oversized bodies", () => {
    expect(() => requireBodyWithinLimit(new Request("http://localhost/api/test", { headers: { "content-length": "101" } }), 100)).toThrowError(HttpError);
  });

  it("limits requests within a fixed window and resets afterward", () => {
    const key = `test-${crypto.randomUUID()}`;
    enforceRateLimit(key, 2, 1_000, 1_000);
    enforceRateLimit(key, 2, 1_000, 1_500);
    expect(() => enforceRateLimit(key, 2, 1_000, 1_999)).toThrowError(HttpError);
    expect(() => enforceRateLimit(key, 2, 1_000, 2_000)).not.toThrow();
  });
});