import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest, normalizeApiError } from "@/lib/api-client";

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("returns successful response data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { ready: true } })));

    await expect(apiRequest<{ ready: boolean }>("/api/status")).resolves.toEqual({ ready: true });
  });

  it.each([
    [401, "authentication_required", false],
    [403, "forbidden", false],
    [409, "conflict", true],
    [413, "payload_too_large", false],
    [429, "rate_limited", true],
    [503, "provider_unavailable", true],
    [500, "server_error", true],
  ])("maps HTTP %s to %s", async (status, code, retryable) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Safe failure." }, { status })));

    const error = await apiRequest("/api/test").catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, code, retryable, source: "/api/test", message: "Safe failure." });
  });

  it("rejects malformed JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", { status: 200 })));

    await expect(apiRequest("/api/test")).rejects.toMatchObject({ code: "invalid_response", retryable: true });
  });

  it("classifies request timeouts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("Timed out", "TimeoutError"); }));

    await expect(apiRequest("/api/test")).rejects.toMatchObject({ code: "request_timeout", retryable: true });
  });

  it("classifies network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Connection refused"); }));

    await expect(apiRequest("/api/test")).rejects.toMatchObject({ code: "network_error", retryable: true });
  });

  it("normalizes unexpected thrown values without exposing them", () => {
    expect(normalizeApiError("private failure", "/api/state")).toMatchObject({
      code: "request_failed",
      message: "The API request failed unexpectedly.",
      source: "/api/state",
    });
  });
});