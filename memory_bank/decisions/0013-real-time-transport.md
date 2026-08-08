---
id: 0013-real-time-transport
type: decision
created: 2026-08-07
updated: 2026-08-08
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
- Deliver persisted domain events for all four live channels from the companion real-time process; transport heartbeats never fabricate module data or trigger state persistence.
- Prefer WebSocket mode and fall back to polling snapshots when the socket is unavailable; consumers subscribe to the same event API in either mode.
- Mount the transport only inside an authenticated workspace and pause it with the app-wide offline state.
- On reconnect, replay persisted events after the project cursor as reconciliation events.

## Validation

- Browser checks observed WebSocket, polling fallback, offline, reconciled polling, and restored WebSocket states.
- Persisted `agent-status`, `notifications`, `status`, and `voice` events were multiplexed to one authenticated socket.
- Cursor replay reconciled events persisted while the socket was disconnected.
- Replayed events did not generate `/api/state` writes or synthetic progress, token, or notification changes.
- ESLint and the production build passed; Next generated all 32 pages and the dynamic dev-log route.

## Consequences

Live modules no longer own transport cadence, and transport liveness is not presented as domain activity. Producers must persist real project-scoped events before the companion process delivers them over WebSocket or polling.

## See Also

- [Error, Offline, and Undo Contract](0012-error-offline-undo-contract.md)
- [Phase 1 Tracker](../todos/phase-1.md)