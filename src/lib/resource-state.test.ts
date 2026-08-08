import { describe, expect, it } from "vitest";

import { resolveResourceState, type ProviderStatus, type ResourceMetadata } from "@/lib/resource-state";

const metadata: ResourceMetadata = {
  source: "api",
  lastSucceededAt: null,
  retryable: true,
  providerStatus: "connected",
};

describe("resolveResourceState", () => {
  it.each([
    { name: "idle", input: {}, expected: "idle" },
    { name: "loading", input: { loading: true }, expected: "loading" },
    { name: "ready-empty", input: { data: [] }, expected: "ready-empty" },
    { name: "filtered-empty", input: { data: [], filtered: true }, expected: "filtered-empty" },
    { name: "ready-populated", input: { data: ["record"] }, expected: "ready-populated" },
    { name: "stale", input: { data: ["record"], staleAt: "2026-08-07T10:00:00.000Z" }, expected: "stale" },
    { name: "error", input: { error: { code: "request_failed", message: "Request failed." } }, expected: "error" },
  ])("resolves $name resources", ({ input, expected }) => {
    expect(resolveResourceState({ ...input, isEmpty: (data: string[]) => data.length === 0, metadata }).status).toBe(expected);
  });

  it.each([
    ["unconfigured", "unconfigured"],
    ["unreachable", "disconnected"],
    ["error", "disconnected"],
  ] satisfies Array<[ProviderStatus, string]>)
  ("preserves the %s provider state as %s", (providerStatus, expected) => {
    expect(resolveResourceState({
      data: ["cached"],
      isEmpty: (data) => data.length === 0,
      metadata: { ...metadata, providerStatus },
    }).status).toBe(expected);
  });

  it("prioritizes active failures over stale, loading, and populated data", () => {
    expect(resolveResourceState({
      data: ["cached"],
      error: { code: "timeout", message: "The request timed out." },
      isEmpty: (data) => data.length === 0,
      loading: true,
      metadata: { ...metadata, providerStatus: "unreachable" },
      staleAt: "2026-08-07T10:00:00.000Z",
    }).status).toBe("error");
  });

  it("prioritizes provider disconnection over stale and ready data", () => {
    expect(resolveResourceState({
      data: ["cached"],
      isEmpty: (data) => data.length === 0,
      metadata: { ...metadata, providerStatus: "unreachable" },
      staleAt: "2026-08-07T10:00:00.000Z",
    }).status).toBe("disconnected");
  });

  it("does not classify populated filtered data as empty", () => {
    expect(resolveResourceState({
      data: ["record"],
      filtered: true,
      isEmpty: (data) => data.length === 0,
      metadata,
    }).status).toBe("ready-populated");
  });

  it("prioritizes loading over filtered-empty", () => {
    expect(resolveResourceState({
      data: [],
      filtered: true,
      isEmpty: (data) => data.length === 0,
      loading: true,
      metadata,
    }).status).toBe("loading");
  });
});