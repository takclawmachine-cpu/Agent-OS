import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type AgentDatabase } from "@/server/database";
import { readModuleState, writeModuleState } from "@/server/module-state";

let database: AgentDatabase;
beforeEach(() => {
  database = createDatabase(":memory:");
  const now = new Date().toISOString();
  database.prepare("INSERT INTO projects (id, name, environment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("agent-os", "Test Project", "Local", now, now);
  database.prepare("INSERT INTO skills VALUES (?, ?, ?, ?)").run("skill-git", "Git", "Engineering", "Test fixture");
});
afterEach(() => database.close());

describe("module state migration", () => {
  it("round-trips original and operational state without deleting agent relationships", () => {
    database.prepare("INSERT INTO agents VALUES (?, ?, ?, ?, ?, ?)").run("agent-1", "agent-os", "Test Agent", "test-model", "idle", 0);
    database.prepare("INSERT INTO agent_skills VALUES ('agent-1', 'skill-git', ?)").run(new Date().toISOString());
    const state = readModuleState(database, "agent-os");
    state.original.chat.push({ id: "chat-test", who: "me", text: "Persisted", time: "12:00" });
    const notifications = state.operational.notifications as unknown as Array<{ id: string; title: string; detail: string; time: string; severity: string; read: boolean }>;
    notifications.push({ id: "notice-test", title: "Persisted", detail: "Database", time: "12:00", severity: "success", read: false });
    state.operational.billing.monthlyCap = 8000;
    state.operational.environment = "Staging";

    writeModuleState(database, "agent-os", "original", state.original, "demo-admin", "admin");
    writeModuleState(database, "agent-os", "operational", state.operational, "demo-admin", "admin");

    const saved = readModuleState(database, "agent-os");
    expect(saved.original.chat.some((message) => message.id === "chat-test")).toBe(true);
    expect((saved.operational.notifications as unknown as Array<{ id: string }>).some((notice) => notice.id === "notice-test")).toBe(true);
    expect(database.prepare("SELECT COUNT(*) FROM agent_skills WHERE agent_id = 'agent-1'").pluck().get()).toBe(1);
    expect(database.prepare("SELECT action FROM audit_logs ORDER BY created_at").pluck().all()).toEqual(["usage-cap.update", "environment.switch"]);
  });

  it("preserves distinct provider availability states", () => {
    database.prepare("INSERT INTO api_connections VALUES (?, ?, ?, ?, ?, ?)").run(
      "provider-hermes",
      "agent-os",
      "hermes",
      "unreachable",
      null,
      new Date().toISOString(),
    );

    const state = readModuleState(database, "agent-os");

    expect(state.original.apiStatus.find((provider) => provider.id === "provider-hermes")?.status).toBe("unreachable");
  });
});