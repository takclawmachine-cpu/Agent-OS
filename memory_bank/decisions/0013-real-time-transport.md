---
id: 0013-real-time-transport
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["10.1", "10.2", "10.3", "10.4"]
status: active
tags: [realtime, websocket, polling, reconciliation]
---

# Real-Time Transport

## Context

Agent status, notifications, status, and Voice need one live event shape that can move from Phase 1 mocks to a Hermes connection without changing UI consumers.

## Decision

- Use one typed, project-scoped event envelope with channel, sequence, timestamp, event type, and payload fields.
- Emit one multiplexed periodic batch for all four live channels from the root real-time provider.
- Prefer WebSocket mode and fall back to polling snapshots when the socket is unavailable; consumers subscribe to the same event API in either mode.
- Pause the stream with the app-wide offline state. On reconnect, emit reconciliation events containing the number of missed ticks before periodic updates resume.
- Keep the real Hermes server connection in Phase 2; Phase 1 uses the same client contract through a deterministic mock adapter.

## Validation

- Browser checks observed WebSocket, polling fallback, offline, reconciled polling, and restored WebSocket states.
- A periodic batch contained `agent-status`, `notifications`, `status`, and `voice` channels.
- Agent progress and notification recency update through shared transport subscriptions rather than store-owned timers.
- ESLint and the production build passed; Next generated all 32 pages and the dynamic dev-log route.

## Consequences

Live modules no longer own transport cadence. Phase 2 can replace the mock adapter with the Hermes WebSocket and HTTP polling endpoints while preserving event consumers.

## See Also

- [Error, Offline, and Undo Contract](0012-error-offline-undo-contract.md)
- [Phase 1 Tracker](../todos/phase-1.md)