import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const patterns = [
  ["OpenAI API key", /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];

let content = "";
let scope = "staged additions";
try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  const diff = execFileSync("git", ["diff", "--cached", "--unified=0", "--diff-filter=ACMR"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  content = diff.split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++")).join("\n");
} catch {
  scope = "workspace source files";
  const skippedDirectories = new Set([".git", ".next", "node_modules", "data", "backups", "coverage"]);
  const allowedExtensions = new Set([".js", ".mjs", ".ts", ".tsx", ".json", ".yml", ".yaml", ".md", ".css"]);
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (skippedDirectories.has(entry.name) || entry.name.startsWith(".env")) continue;
      const location = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(location);
      else if (allowedExtensions.has(path.extname(entry.name))) content += `\n${fs.readFileSync(location, "utf8")}`;
    }
  };
  visit(process.cwd());
}

const findings = patterns.filter(([, pattern]) => pattern.test(content)).map(([name]) => name);
if (findings.length) {
  console.error(`Potential secrets detected in ${scope}: ${findings.join(", ")}.`);
  process.exit(1);
}
console.log(`No high-confidence secrets detected in ${scope}.`);