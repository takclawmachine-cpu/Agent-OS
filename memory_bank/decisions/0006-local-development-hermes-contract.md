---
id: 0006-local-development-hermes-contract
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["3.1", "10.1"]
status: active
tags: [local-development, environment, hermes, realtime]
---

# Local Development and Hermes Contract

## Context

Developers need one reliable local start path and clear instructions for connecting a local Hermes runtime without exposing secrets or bypassing the Phase 1 real-time transport gate.

## Decision

- Document local setup from the repository root in `README.md` and the web package in `apps/web/README.md`.
- Keep safe environment placeholders in the exact root file `example.env`; copy it to ignored `apps/web/.env.local` for local use.
- Keep generated Next.js agent rules in root `AGENTS.md` and the project workflow in `memory_bank/index.md`.
- Define the Hermes topology and test envelope in `docs/hermes-local.md`.
- Require a WebSocket-compatible bridge when Hermes exposes only HTTP, CLI, or stdio.
- Keep authentication tokens server-side and prohibit secrets in `NEXT_PUBLIC_*` values.
- Leave Task 10 unchecked until the shared client, polling fallback, and reconnect/reconcile behavior are implemented and tested.

## Validation

- The installed Next.js version requires Node.js 20.9 or newer, which is reflected in the README.
- `npm run lint` completed with no errors or warnings after local fixes.
- `npm run build` completed and generated all 30 static pages.
- The local development server is available at `http://127.0.0.1:3000`.

## Consequences

A developer can run the current Phase 1 shell immediately and can test a Hermes endpoint directly with `wscat` before the gated Task 10 integration begins.

## See Also

- [Next.js Foundation](0003-nextjs-foundation.md)
- [App Shell and Navigation](0005-app-shell-navigation.md)
- [Phase 1 Tracker](../todos/phase-1.md)
