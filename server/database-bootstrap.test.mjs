import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { initializeDatabase } from "./database-bootstrap.mjs";

describe("database bootstrap", () => {
  it("creates the scheduler tables needed for local startup", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-os-"));
    const databasePath = path.join(tempDir, "agent-os.db");
    const database = initializeDatabase(databasePath);

    const table = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cron_jobs'").get();
    expect(table).toBeTruthy();

    database.close();
  });
});
