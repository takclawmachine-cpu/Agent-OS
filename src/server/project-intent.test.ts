import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type AgentDatabase } from "@/server/database";
import { resolveProjectIntent } from "@/server/project-intent";

let database: AgentDatabase;

beforeEach(() => {
  database = createDatabase(":memory:");
  const now = new Date().toISOString();
  const insert = database.prepare("INSERT INTO projects (id, name, environment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
  insert.run("alpha", "Project Alpha", "Local", now, now);
  insert.run("alpha-mobile", "Project Alpha Mobile", "Staging", now, now);
  insert.run("beta", "Beta", "Production", now, now);
});

afterEach(() => database.close());

describe("project intent", () => {
  it("resolves explicit exact project commands", () => {
    expect(resolveProjectIntent(database, "switch to project beta")).toMatchObject({ type: "exact", matches: [{ id: "beta" }] });
  });

  it("returns ambiguous project matches without choosing one", () => {
    expect(resolveProjectIntent(database, "open alpha")).toMatchObject({ type: "ambiguous", matches: [{ id: "alpha" }, { id: "alpha-mobile" }] });
  });

  it("does not treat ordinary discussion as a switch command", () => {
    expect(resolveProjectIntent(database, "What is happening in Beta?")).toEqual({ type: "none" });
  });

  it("reports unknown explicit project commands", () => {
    expect(resolveProjectIntent(database, "show project Gamma")).toMatchObject({ type: "not-found", query: "Gamma" });
  });
});