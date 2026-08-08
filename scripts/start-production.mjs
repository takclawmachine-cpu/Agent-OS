import { spawn } from "node:child_process";

import { configurationIssues } from "../server/runtime-config.mjs";

const commands = [["web", ["server.js"]]];
const issues = configurationIssues();
if (!issues.length) {
  commands.push(["realtime", ["server/realtime.mjs"]], ["scheduler", ["server/scheduler.mjs"]]);
} else {
  console.warn(`Agent OS setup is incomplete (${issues.join(", ")}). Web setup access is available; background services are disabled.`);
}

const children = commands.map(([name, args]) => {
  const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
  child.once("exit", (code, signal) => {
    if (signal || code) {
      console.error(`${name} stopped unexpectedly.`);
      process.kill(process.pid, "SIGTERM");
    }
  });
  return child;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    children.forEach((child) => child.kill(signal));
    process.exit(0);
  });
}