import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type AgentDatabase } from "@/server/database";
import { readModuleState, writeModuleState } from "@/server/module-state";

let database: AgentDatabase;
beforeEach(() => { database = createDatabase(":memory:"); });
afterEach(() => database.close());

describe("module state migration", () => {
  it("round-trips original and operational state without deleting agent relationships", () => {
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
});