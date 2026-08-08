---
id: 0012-error-offline-undo-contract
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7"]
status: active
tags: [errors, offline, undo, reliability, logging]
---

# Error, Offline, and Undo Contract

## Context

Phase 1 needed distinct field, module, and application failures; a persistent reconnecting offline state; reversible destructive actions; and developer evidence inside the project memory bank.

## Decision

- Keep expected field failures beside their input and expected module failures inside the owning module card.
- Use Next.js segment and global error boundaries for unexpected page and root-layout failures, each with an explicit retry path.
- Keep one root reliability provider driven by browser online/offline events plus a Settings simulation control. The persistent banner clears automatically when browser connectivity returns.
- Treat Voice transcription, Terminal execution, and API Explorer requests as offline when the shared provider is disconnected; disable backend-dependent controls while preserving local state.
- Route every destructive control through one root undo provider with a six-second rollback window. Terminal `clear` follows the same contract as delete buttons.
- Append sanitized field, module, app, offline, and reconnect events to `memory_bank/logs/reliability.jsonl` through a development-only Node route. Production rejects writes.
- Defer queued operation replay, polling fallback, and missed-event reconciliation to Task 10's transport contract.

## Validation

- ESLint completed without errors or warnings, and the production build generated all 32 pages plus the dynamic development log route.
- API Explorer invalid JSON rendered a field error; Voice permission failure rendered a module error; segment and root error boundaries exposed retry actions and recovered.
- Browser offline/online events displayed and automatically cleared the persistent app banner and Terminal module notice.
- Voice, Terminal, and API Explorer controls were disabled offline and restored after reconnect.
- Mail, Cron, GitHub, To-Do, and Terminal history deletion/clearing all passed remove-and-undo browser checks.
- The memory-bank JSONL log contained field, module, app, offline, and reconnect records.
- All 27 module routes had no horizontal overflow at a measured 390 x 844 viewport with the offline banner active.

## Consequences

Agent OS now has one reliability vocabulary and one destructive-action recovery path across the app. Task 10 can add transport fallback and reconciliation behind the existing connectivity UI without changing module contracts.

## See Also

- [Empty State Contract](0011-empty-state-contract.md)
- [Tool Module Wiring](0010-tool-module-wiring.md)
- [Phase 1 Tracker](../todos/phase-1.md)
