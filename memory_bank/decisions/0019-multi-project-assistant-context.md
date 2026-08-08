---
id: 0019-multi-project-assistant-context
type: decision
created: 2026-08-08
updated: 2026-08-08
phase: 4
related_tasks: ["3.4", "3.7", "4.4", "4.8", "4.9", "5"]
status: active
tags: [projects, assistant, context, voice, concurrency]
---

# Multi-Project Assistant Context

## Context

Users need to monitor and converse with several projects without losing context or silently changing the full workspace. Global chat/voice state and hardcoded project assumptions could route content to the wrong project.

## Decision

- Support up to four movable, restorable in-app project assistant panels.
- Bind each panel to one immutable project ID; opening or focusing a panel does not switch the main workspace.
- Build bounded provider context on the server from only the selected project's persisted records.
- Persist completed user/assistant message pairs and token usage transactionally to that project.
- Use the same persisted project-assistant conversation path for the main AI Chat workspace and floating project panels so recent messages survive reload.
- Show recent project prompts in a default-open, collapsible main-workspace rail with an explicit empty state.
- Recognize explicit project-open commands deterministically and require confirmation before opening or focusing a target project.
- Keep ordinary discussion in the current project context; never silently merge another project's data.
- Include project identity in voice state, transcript events, transcription requests, and TTS requests.
- Allow only one microphone capture owner at a time; only the focused panel may start panel voice capture.
- Keep full modules in the main workspace. Panels expose summary, contextual chat, voice, status, and an explicit full-workspace action.

## Consequences

Different projects can chat concurrently while project data remains isolated. Sends within one panel are serialized by its UI state. Open-panel layout is local browser state, while messages and context remain server-owned. Multi-project realtime multiplexing, panel resizing, and full behavior-focused UI tests remain follow-up work.

## Validation

- Context tests prove project A prompts never contain project B records.
- Provider failure persists no chat messages.
- Main-workspace chat results hydrate from the same project-scoped message records as assistant panels.
- Intent tests cover exact, ambiguous, unknown, and ordinary discussion paths.
- Voice callers and APIs require or resolve an active project identity.
- ESLint passes, all 64 Vitest tests pass, and the optimized production build succeeds.