const passwordHashPattern = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function configurationIssues(environment = process.env) {
  const value = (name) => environment[name]?.trim() ?? "";
  const issues = [];
  if (value("AGENT_OS_OWNER_NAME").length < 2) issues.push("AGENT_OS_OWNER_NAME");
  if (!emailPattern.test(value("AGENT_OS_OWNER_EMAIL"))) issues.push("AGENT_OS_OWNER_EMAIL");
  if (!passwordHashPattern.test(value("AGENT_OS_OWNER_PASSWORD_HASH"))) issues.push("AGENT_OS_OWNER_PASSWORD_HASH");
  if (value("AGENT_OS_SESSION_SECRET").length < 32) issues.push("AGENT_OS_SESSION_SECRET");
  if (!value("AGENT_OS_DATABASE_PATH")) issues.push("AGENT_OS_DATABASE_PATH");
  if (!value("AGENT_OS_BACKUP_PATH")) issues.push("AGENT_OS_BACKUP_PATH");
  if (!["OPENAI_API_KEY", "OPENROUTER_API_KEY", "GROQ_API_KEY", "XAI_API_KEY"].some((name) => value(name)) && value("HERMES_CLI_ENABLED") !== "true") issues.push("AI_PROVIDER");
  return issues;
}

export function assertConfigured(environment = process.env) {
  const issues = configurationIssues(environment);
  if (issues.length) throw new Error(`Agent OS setup is incomplete: ${issues.join(", ")}. Run npm run setup.`);
}