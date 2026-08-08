---
id: current-context
type: architecture
created: 2026-08-08
updated: 2026-08-08
phase: 4
related_tasks: ["2", "3", "4", "5", "6"]
status: active
tags: [task-start, current-state, architecture, retrieval]
---

# Current Project Context

Read this after `memory_bank/index.md` at the start of every task. It is a concise routing note, not a replacement for current code, tests, or detailed decisions.

## Product

Agent OS is a secure, local-first AI project command center built with Next.js 16, React 19, SQLite, a companion WebSocket server, and a scheduler. One configured owner can operate multiple isolated projects through full workspaces and up to four assistant panels.

## Current Runtime Contract

- Login is blocked until secure owner, session, storage, and at least one AI provider setting are supplied through environment configuration.
- The HttpOnly cookie is the only authentication authority.
- Fresh databases contain schema only. First login upserts the configured owner; onboarding creates a named blank project.
- SQLite is authoritative. Browser storage holds selected project, panel layout, and optimistic/offline cache only.
- Every project-scoped API requires an explicit existing project ID. There is no demo/default project fallback.
- Optional providers may be unconfigured or unreachable without blocking unrelated modules.
- Docker uses standalone Next output, runtime-injected environment variables, non-root execution, and persistent data/backup volumes.

## Current Feature State

- Projects, Vault, Search, Environments, and Skills read persisted backend data.
- Production state stores live under `src/state`, distinguish empty/populated/error states, and roll back rejected optimistic changes without overwriting newer edits.
- The shared resource-state resolver distinguishes true-empty from filtered-empty while preserving failure, disconnection, stale-data, and loading precedence.
- Up to four movable project assistant panels restore locally after reload.
- Each panel has immutable project identity, real summary data, contextual chat, persisted message/token attribution, and an explicit full-workspace action.
- Explicit `open`, `show`, or `switch to` project commands require confirmation; ambiguous matches require selection.
- Voice transcript events and voice APIs carry project identity. Only one capture can own the microphone at a time.
- Realtime transport starts only for authenticated workspaces and delivers persisted domain events without mutating or persisting module state from heartbeat traffic.
- Realtime still has one project subscription per socket; multi-panel subscription multiplexing remains pending.

## Ownership Map

| Area | Primary files |
|---|---|
| Secure setup and readiness | `src/server/config.ts`, `scripts/setup-env.mjs`, `src/app/api/config/status/route.ts` |
| Authentication | `src/server/session.ts`, `src/app/api/auth/session/route.ts`, `src/components/auth-gate.tsx` |
| Database and services | `src/server/database.ts`, `src/server/services.ts`, `src/server/module-state.ts` |
| Generic project APIs | `src/app/api/[resource]/route.ts` |
| Project assistant | `src/components/project-panel-provider.tsx`, `src/components/project-assistant-panel.tsx`, `src/app/api/project-assistant/route.ts` |
| Context and project intent | `src/server/project-context.ts`, `src/server/project-assistant.ts`, `src/server/project-intent.ts` |
| Voice | `src/lib/voice.ts`, `src/app/api/voice/*`, `src/components/voice-core.tsx` |
| Realtime and scheduling | `src/components/realtime-provider.tsx`, `server/realtime.mjs`, `server/scheduler.mjs` |
| Module state UI | `src/components/*-module-view.tsx`, `src/state/*.ts` |
| Deployment | `Dockerfile`, `scripts/start-production.mjs`, `memory_bank/docs/security-operations.md` |

## Non-Negotiable Invariants

- Never add demo credentials, seeded sample content, simulated live events, or hardcoded project IDs.
- Never expose, log, commit, or return provider keys, password hashes, session secrets, or plaintext passwords.
- Never merge context from different projects without an explicit user-approved operation.
- Never switch the main workspace because a project assistant panel opened.
- Preserve genuine user data and unrelated working-tree changes.
- Verify Next.js behavior against `node_modules/next/dist/docs/` before Next-specific edits.

## Current Validation Baseline

- Published checkpoints: `f7a3ed7` (state reliability) and `ed67fba` (multi-project assistant panels).
- ESLint passes.
- Vitest: 73 tests pass across 17 files.
- Optimized Next.js production build passes after clearing stale generated `.next` output when OneDrive locks it.
- Staged secret scanning passes.
- Docker runtime execution is not locally verified because Docker is unavailable in the current environment.

## Active Work

Use [Phase 4](../todos/phase-4.md) for granular status. Highest-value pending work:

1. Add exact failed-operation retry and stale-cache behavior.
2. Complete the remaining provider capability and all-module state matrices.
3. Add multi-project realtime subscriptions and panel resize controls.
4. Add component/Playwright coverage and Docker runtime verification.

## Task Routing

- Security/setup: read [Decision 0018](../decisions/0018-secure-configuration-zero-demo.md) and [Security Operations](../docs/security-operations.md).
- Database/API: read [Decision 0015](../decisions/0015-sqlite-backend-authority.md).
- Providers/realtime: read [Decision 0016](../decisions/0016-provider-realtime-boundaries.md).
- Project panels/chat/voice: read [Decision 0019](../decisions/0019-multi-project-assistant-context.md).
- UI/state behavior: read [Empty State](../decisions/0011-empty-state-contract.md), [Error/Offline/Undo](../decisions/0012-error-offline-undo-contract.md), and Phase 4.