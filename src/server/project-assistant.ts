import { randomUUID } from "node:crypto";

import type { AgentDatabase } from "@/server/database";
import { requirePermission, type Role } from "@/server/policies";
import { buildProjectContext } from "@/server/project-context";
import { completeChat, type ChatMessage } from "@/server/providers";
import { enforceUsageCap } from "@/server/services";

export type ChatProvider = "hermes" | "openai" | "openrouter" | "groq" | "xai";

export function configuredChatProvider(): ChatProvider {
  if (process.env.HERMES_CLI_ENABLED === "true") return "hermes";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.XAI_API_KEY) return "xai";
  return "hermes";
}

export async function createProjectAssistantReply(
  database: AgentDatabase,
  input: { projectId: string; message: string; provider?: ChatProvider },
  userId: string,
  role: Role,
  complete: (provider: ChatProvider, messages: ChatMessage[]) => Promise<{ text: string; usage: { prompt_tokens?: number; completion_tokens?: number } }> = completeChat,
) {
  requirePermission(role, "write");
  const message = input.message.trim();
  if (!message || message.length > 8_000) throw new Error("Message must contain between 1 and 8000 characters.");
  const provider = input.provider ?? configuredChatProvider();
  const cost = provider === "hermes" ? 0 : 0.01;
  enforceUsageCap(database, input.projectId, cost);
  const context = buildProjectContext(database, input.projectId);
  const result = await complete(provider, [...context.messages, { role: "user", content: message }]);
  const timestamp = new Date().toISOString();
  const userMessage = { id: randomUUID(), who: "me" as const, text: message, time: timestamp };
  const assistantMessage = { id: randomUUID(), who: "agent" as const, text: result.text, time: timestamp };
  database.transaction(() => {
    const insert = database.prepare("INSERT INTO chat_messages (id, project_id, user_id, sender, text, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    insert.run(userMessage.id, input.projectId, userId, "user", userMessage.text, timestamp);
    insert.run(assistantMessage.id, input.projectId, null, "agent", assistantMessage.text, timestamp);
    database.prepare("INSERT INTO token_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), input.projectId, provider, provider === "hermes" ? "local-auto" : process.env.CHAT_MODEL ?? "gpt-4o-mini", result.usage.prompt_tokens ?? 0, result.usage.completion_tokens ?? 0, cost, timestamp);
  })();
  return { project: { id: input.projectId, name: context.projectName }, messages: [userMessage, assistantMessage] };
}