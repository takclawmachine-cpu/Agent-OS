import { execFileSync } from "node:child_process";
import fs from "node:fs";

if (!fs.existsSync(".git")) process.exit(0);
try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
  if (process.platform !== "win32") fs.chmodSync(".githooks/pre-commit", 0o755);
  console.log("Agent OS Git security hooks configured.");
} catch {
  console.warn("Git hooks could not be configured; run npm run security:hooks manually.");
}