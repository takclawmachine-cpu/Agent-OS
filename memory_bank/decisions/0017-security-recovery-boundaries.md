---
id: 0017-security-recovery-boundaries
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 3
related_tasks: ["1", "2", "3", "4", "5", "6"]
status: active
tags: [security, sessions, csrf, audit, retention, recovery]
---

# Security And Recovery Boundaries

## Context

Phase 3 requires server-trusted identity, abuse controls, attributable sensitive operations, bounded logs, tested recovery, and independent secret scanning before launch.

## Decision

- Derive roles and user identity only from signed eight-hour HttpOnly sessions; never trust browser role headers or local storage for authorization.
- Require signed sessions for internal APIs and realtime, exact same-origin browser mutations, and endpoint-appropriate body and request-rate limits.
- Isolate manual and scheduled backup/recovery work by `AGENT_OS_ENVIRONMENT`.
- Keep audit records outside retention rotation and expose audit, Terminal, webhook, backup, and drill logs only to admins.
- Retain and rotate operational logs according to `memory_bank/docs/security-operations.md`.
- Run weekly recovery drills by restoring a completed backup to a temporary sandbox, verifying checksum and SQLite integrity, recording the outcome, and deleting the sandbox copy.
- Scan staged credentials locally and run dependency plus full-history Gitleaks scans in CI.

## Validation

Lint, 22 tests, optimized build, all 27 module routes, development smoke, Hermes smoke, and production smoke pass. Forged role headers and cross-origin mutations return `403`; anonymous WebSocket upgrades return `401`. Recovery tests perform a real SQLite backup and sandbox restore. The live scheduler currently has no eligible completed backup to drill.

## Secret Scan Evidence

Official Gitleaks scans found no leaks in the current commit-eligible source tree. The supplied GitHub repository mirror also scanned clean and currently contains zero commits. Ignored `.env.local` and generated `.next` output contain expected local/build values and remain outside the source-control boundary. Pre-commit and CI scans protect future history.

## Consequences

Phase 3 is signed off. The application is ready for repository publication and deployment preparation; hosted Voice remains fail-closed until the operator supplies `OPENAI_API_KEY` directly in the server environment.

## See Also

- [Security Operations](../docs/security-operations.md)
- [Phase 3 Tracker](../todos/phase-3.md)