import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, type AgentDatabase } from "@/server/database";
import { createProjectAssistantReply, type ChatProvider } from "@/server/project-assistant";
import { buildProjectContext } from "@/server/project-context";
import type { ChatMessage } from "@/server/providers";

let database: AgentDatabase;

beforeEach(() => {
  database = createDatabase(":memory:");
  const now = new Date().toISOString();
  database.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run("owner", "owner@example.com", "Owner", "admin", now);
  database.prepare("INSERT INTO projects (id, name, environment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("alpha", "Alpha", "Local", now, now);
  database.prepare("INSERT INTO projects (id, name, environment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("beta", "Beta", "Local", now, now);
  database.prepare("INSERT INTO tasks VALUES (?, ?, ?, 0, 'none', NULL, 1, ?)").run("task-alpha", "alpha", "Alpha-only task", now);
  database.prepare("INSERT INTO tasks VALUES (?, ?, ?, 0, 'none', NULL, 1, ?)").run("task-beta", "beta", "Beta secret task", now);
});

afterEach(() => database.close());

describe("project assistant", () => {
  it("builds bounded context from only the selected project", () => {
    const context = buildProjectContext(database, "alpha");
    expect(context.messages[0].content).toContain("Alpha-only task");
    expect(context.messages[0].content).not.toContain("Beta secret task");
  });

  it("persists a completed message pair and usage to the selected project", async () => {
    const complete = vi.fn(async (...arguments_: [ChatProvider, ChatMessage[]]) => {
      void arguments_;
      return { text: "Alpha response", usage: { prompt_tokens: 12, completion_tokens: 4 } };
    });
    const result = await createProjectAssistantReply(database, { projectId: "alpha", message: "What is next?", provider: "openai" }, "owner", "admin", complete);

    expect(result.messages).toHaveLength(2);
    expect(complete.mock.calls[0][1][0].content).not.toContain("Beta secret task");
    expect(database.prepare("SELECT COUNT(*) FROM chat_messages WHERE project_id = 'alpha'").pluck().get()).toBe(2);
    expect(database.prepare("SELECT COUNT(*) FROM chat_messages WHERE project_id = 'beta'").pluck().get()).toBe(0);
    expect(database.prepare("SELECT provider FROM token_usage WHERE project_id = 'alpha'").pluck().get()).toBe("openai");
  });

  it("persists nothing when the provider fails", async () => {
    await expect(createProjectAssistantReply(database, { projectId: "alpha", message: "Fail" }, "owner", "admin", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect(database.prepare("SELECT COUNT(*) FROM chat_messages").pluck().get()).toBe(0);
  });
});