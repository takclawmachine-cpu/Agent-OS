export const moduleGroups = [
  {
    label: "Core",
    modules: [
      { slug: "dashboard", label: "Dashboard", icon: "dashboard", description: "Project command center and live operational summary." },
      { slug: "mail", label: "Mail & SMTP", icon: "mail", description: "Message delivery, inbox status, and SMTP configuration." },
      { slug: "cron", label: "Cron Jobs", icon: "clock", description: "Scheduled jobs and recurring agent work." },
      { slug: "plans", label: "Plan Control", icon: "plans", description: "Stage, approve, and monitor execution plans." },
      { slug: "browser-preview", label: "Browser Preview", icon: "browser", description: "Inspect the active project's local application." },
      { slug: "agents", label: "Agents", icon: "agents", description: "Configure the project agent roster." },
      { slug: "agent-status", label: "Agent Working Status", icon: "activity", description: "Live progress and work state for every agent." },
      { slug: "tokens", label: "Tokens & Models", icon: "tokens", description: "Model usage, token volume, and cost telemetry." },
      { slug: "api-status", label: "API Status", icon: "api", description: "Provider connection and service health." },
      { slug: "github", label: "GitHub", icon: "github", description: "Repository state, branches, and automation." },
      { slug: "chat", label: "AI Chat", icon: "chat", description: "Project-scoped conversations with Hermes and agents." },
      { slug: "vault", label: "Obsidian Vault", icon: "vault", description: "Browse indexed project memory and decisions." },
    ],
  },
  {
    label: "Operations",
    modules: [
      { slug: "notifications", label: "Notifications", icon: "notifications", description: "Project events that need attention." },
      { slug: "search", label: "Search & Command", icon: "search", description: "Find modules, actions, and project knowledge." },
      { slug: "settings", label: "Settings", icon: "settings", description: "Personal and workspace preferences." },
      { slug: "onboarding", label: "Onboarding", icon: "onboarding", description: "Resume project setup and connection checks." },
      { slug: "status", label: "Status Page", icon: "status", description: "Consolidated health across Agent OS services." },
      { slug: "billing", label: "Billing & Caps", icon: "billing", description: "Usage budgets, limits, and billing signals." },
      { slug: "digests", label: "Digests", icon: "digests", description: "Scheduled summaries assembled from module data." },
      { slug: "environments", label: "Environments", icon: "environments", description: "Switch between local, staging, and production contexts." },
    ],
  },
  {
    label: "Tools",
    modules: [
      { slug: "voice", label: "Voice", icon: "voice", description: "Speech input, transcription, and response playback." },
      { slug: "todo", label: "To-Do", icon: "todo", description: "Personal tasks linked optionally to plans and agents." },
      { slug: "skills", label: "Skills", icon: "skills", description: "Agent capabilities and assignment mapping." },
      { slug: "terminal", label: "Terminal", icon: "terminal", description: "Sandboxed project command console with audited execution." },
      { slug: "api-explorer", label: "API Explorer", icon: "api", description: "Build and inspect live internal API requests." },
      { slug: "reports", label: "Generate Report", icon: "reports", description: "Compose on-demand project summaries." },
      { slug: "preview-app", label: "Preview App", icon: "preview", description: "Open the current project's configured preview." },
    ],
  },
] as const;

export type ModuleDefinition = (typeof moduleGroups)[number]["modules"][number];
export const modules = moduleGroups.flatMap<ModuleDefinition>(
  (group) => group.modules as readonly ModuleDefinition[],
);

const originalModuleSlugs = new Set(["dashboard", "mail", "cron", "plans", "browser-preview", "agents", "agent-status", "tokens", "api-status", "github", "chat", "vault"]);
const operationalModuleSlugs = new Set(["notifications", "search", "settings", "status", "billing", "digests", "environments"]);
const toolModuleSlugs = new Set(["voice", "todo", "skills", "terminal", "api-explorer", "reports", "preview-app"]);

export type ModuleSlug = ModuleDefinition["slug"];
export type IconName = ModuleDefinition["icon"] | "folder" | "menu" | "close" | "chevron" | "sun" | "moon" | "microphone" | "lock" | "eye" | "arrow" | "logout" | "check" | "trash" | "plus" | "send" | "refresh" | "copy" | "play";

export function getModule(slug: string): ModuleDefinition | undefined {
  return modules.find((module) => module.slug === slug);
}

export function isOriginalModule(slug: string) {
  return originalModuleSlugs.has(slug);
}

export function isOperationalModule(slug: string) {
  return operationalModuleSlugs.has(slug);
}

export function isToolModule(slug: string) {
  return toolModuleSlugs.has(slug);
}
