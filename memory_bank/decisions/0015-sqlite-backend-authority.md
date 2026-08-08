---
id: 0015-sqlite-backend-authority
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 2
related_tasks: ["1", "3", "4", "5.1-5.6", "5.10-5.12"]
status: active
tags: [sqlite, persistence, api, migration, recovery]
---

# SQLite Backend Authority

## Context

Phase 1 client stores provided responsive module behavior but could not enforce relationships, roles, recovery windows, audit history, or durable project state.

## Decision

- Make normalized SQLite records authoritative for all project entities.
- Keep browser storage only as an optimistic and offline cache that hydrates from internal APIs.
- Route mutations through server services for role checks, conflict handling, caps, terminal policy, reports, export, backup, restore, and deletion.
- Migrate complete module state transactionally and preserve relationship rows through agent upserts.

## Validation

Schema, service, migration, backup/restore, export, deletion, and route tests pass. The production build generates all 27 module routes and the dynamic API handlers.

## Consequences

Client state remains responsive without becoming a second source of truth. Database handles must be closed before temporary SQLite files can be removed on Windows.

## See Also

- [Phase 2 Tracker](../todos/phase-2.md)
- [Provider and Realtime Boundaries](0016-provider-realtime-boundaries.md)