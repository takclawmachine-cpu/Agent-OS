import type { IconName, ModuleSlug } from "@/lib/modules";

export type EmptyStateContent = {
  icon: IconName;
  title: string;
  description: string;
  actionLabel: string;
};

export const moduleEmptyStates = {
  dashboard: { icon: "dashboard", title: "No project activity", description: "Create a plan to start building the project pulse.", actionLabel: "Create a plan" },
  mail: { icon: "mail", title: "Inbox is empty", description: "Compose a message to start the local delivery log.", actionLabel: "Compose mail" },
  cron: { icon: "clock", title: "No scheduled jobs", description: "Add a recurring job for the active project.", actionLabel: "Add a job" },
  plans: { icon: "plans", title: "No plans yet", description: "Create a plan to define the next project outcome.", actionLabel: "Create a plan" },
  "browser-preview": { icon: "browser", title: "No preview loaded", description: "Load the active project's configured local URL.", actionLabel: "Load preview" },
  agents: { icon: "agents", title: "No agents configured", description: "Add an agent to begin assigning project work.", actionLabel: "Add an agent" },
  "agent-status": { icon: "activity", title: "No active work", description: "Assign a task to an agent to begin live tracking.", actionLabel: "View agents" },
  tokens: { icon: "tokens", title: "No token usage", description: "Start a project conversation to record model usage.", actionLabel: "Open AI Chat" },
  "api-status": { icon: "api", title: "No providers configured", description: "Run a local check to discover configured providers.", actionLabel: "Run provider check" },
  github: { icon: "github", title: "No repositories connected", description: "Connect a repository for project source telemetry.", actionLabel: "Open settings" },
  chat: { icon: "chat", title: "No conversations yet", description: "Ask Hermes a question about the active project.", actionLabel: "Start a conversation" },
  vault: { icon: "vault", title: "No indexed notes", description: "Open project memory to add the first indexed note.", actionLabel: "Open memory bank" },
  notifications: { icon: "notifications", title: "No notifications yet", description: "New project events will appear here.", actionLabel: "View project status" },
  search: { icon: "search", title: "Nothing indexed yet", description: "Create project records to make them searchable.", actionLabel: "Open dashboard" },
  settings: { icon: "settings", title: "No preferences available", description: "Reload the project defaults for this workspace.", actionLabel: "Reload settings" },
  onboarding: { icon: "onboarding", title: "No setup in progress", description: "Start onboarding to configure the active project.", actionLabel: "Start onboarding" },
  status: { icon: "status", title: "No services discovered", description: "Run provider checks to populate service health.", actionLabel: "Check providers" },
  billing: { icon: "billing", title: "No usage recorded", description: "Model activity will appear against the project cap.", actionLabel: "Open AI Chat" },
  digests: { icon: "digests", title: "No digests generated", description: "Generate a summary from the selected project modules.", actionLabel: "Generate digest" },
  environments: { icon: "environments", title: "No environments configured", description: "Resume onboarding to configure a project target.", actionLabel: "Resume onboarding" },
  voice: { icon: "voice", title: "No transcript captured", description: "Start listening to capture a project command.", actionLabel: "Start listening" },
  todo: { icon: "todo", title: "Nothing on your list", description: "Add a personal task when you are ready.", actionLabel: "Add a to-do" },
  skills: { icon: "skills", title: "No skills assigned", description: "Assign a catalog skill to the selected agent.", actionLabel: "Assign a skill" },
  terminal: { icon: "terminal", title: "No commands run", description: "Run an allowed project command to start this session.", actionLabel: "Run help" },
  "api-explorer": { icon: "api", title: "No response yet", description: "Send a backend request to inspect its response.", actionLabel: "Send request" },
  reports: { icon: "reports", title: "No report preview", description: "Generate an on-demand preview from selected modules.", actionLabel: "Generate preview" },
  "preview-app": { icon: "preview", title: "No preview configured", description: "Configure a project URL before opening Preview App.", actionLabel: "Open Browser Preview" },
} satisfies Record<ModuleSlug, EmptyStateContent>;
