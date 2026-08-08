import { afterEach, describe, expect, it, vi } from "vitest";

import { closeDatabase, getDatabase } from "@/server/database";
import { hashPassword } from "@/server/password";
import { GET, POST } from "./route";

afterEach(() => {
  closeDatabase();
  vi.unstubAllEnvs();
});

function loginRequest(email: string, password: string, client: string) {
  return new Request("http://localhost/api/auth/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "x-forwarded-for": client,
    },
    body: JSON.stringify({ email, password }),
  });
}

describe("session login route", () => {
  it("blocks login when required configuration is missing", async () => {
    const response = await POST(loginRequest("owner@example.com", "password", "config-test"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Agent OS setup is incomplete." });
  });

  it("authenticates the configured owner without returning secrets", async () => {
    const password = "correct horse battery staple";
    const passwordHash = await hashPassword(password);
    vi.stubEnv("AGENT_OS_OWNER_NAME", "Project Owner");
    vi.stubEnv("AGENT_OS_OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("AGENT_OS_OWNER_PASSWORD_HASH", passwordHash);
    vi.stubEnv("AGENT_OS_SESSION_SECRET", "a-secure-session-secret-with-more-than-32-characters");
    vi.stubEnv("AGENT_OS_DATABASE_PATH", ":memory:");
    vi.stubEnv("AGENT_OS_BACKUP_PATH", "./backups");
    vi.stubEnv("OPENAI_API_KEY", "provider-secret");

    const response = await POST(loginRequest("OWNER@example.com", password, "success-test"));
    const body = await response.json() as { data: { email: string; name: string; userId: string } };

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(body.data).toMatchObject({ email: "owner@example.com", name: "Project Owner" });
    expect(body.data.userId).toMatch(/^owner-/);
    expect(JSON.stringify(body)).not.toContain(passwordHash);
    expect(JSON.stringify(body)).not.toContain("provider-secret");
    expect(getDatabase().prepare("SELECT id, email, name, role FROM users").get()).toEqual({
      id: body.data.userId,
      email: "owner@example.com",
      name: "Project Owner",
      role: "admin",
    });

    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    const sessionResponse = await GET(new Request("http://localhost/api/auth/session", { headers: { cookie: cookie ?? "" } }));
    await expect(sessionResponse.json()).resolves.toMatchObject({ data: { email: "owner@example.com", name: "Project Owner", role: "admin" } });
  });
});