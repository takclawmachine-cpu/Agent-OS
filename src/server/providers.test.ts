import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("provider adapters", () => {
  it("fails closed when a provider is not configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { providerFetch } = await import("@/server/providers");
    await expect(providerFetch("openai", "/models")).rejects.toThrow(/not configured/);
  });

  it("attaches server-side credentials and checks all provider states", async () => {
    vi.stubEnv("HERMES_CLI_ENABLED", "false");
    vi.stubEnv("OPENAI_API_KEY", "openai-secret");
    vi.stubEnv("OPENROUTER_API_KEY", "router-secret");
    vi.stubEnv("GITHUB_TOKEN", "github-secret");
    vi.stubEnv("GROQ_API_KEY", "groq-secret");
    vi.stubEnv("XAI_API_KEY", "xai-secret");
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toMatch(/^Bearer /);
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { checkProviders } = await import("@/server/providers");
    const health = await checkProviders();
    expect(health.map((entry) => entry.provider)).toEqual(expect.arrayContaining(["hermes", "openai", "openrouter", "github", "groq", "xai", "smtp", "whisper", "tts"]));
    expect(health.filter((entry) => !["hermes", "smtp"].includes(entry.provider)).every((entry) => entry.status === "connected")).toBe(true);
    expect(health.find((entry) => entry.provider === "hermes")?.status).toBe("unconfigured");
    expect(health.find((entry) => entry.provider === "smtp")?.status).toBe("unconfigured");
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("removes Hermes CLI session metadata from chat output", async () => {
    const { parseHermesOutput } = await import("@/server/providers");
    expect(parseHermesOutput("Connected locally\n\nsession_id: session-123\n")).toBe("Connected locally");
  });
});