---
id: 0016-provider-realtime-boundaries
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 2
related_tasks: ["2", "4.1", "5.7-5.9", "6.9-6.15"]
status: active
tags: [providers, realtime, websocket, polling, credentials, staging]
---

# Provider and Realtime Boundaries

## Context

Next.js route handlers suit request-response provider work but do not own persistent WebSocket connections or scheduled background jobs.

## Decision

- Keep provider credentials server-only and fail closed as unconfigured when credentials are absent.
- Invoke authenticated local Hermes through a bounded safe-mode CLI adapter for AI Chat; never expose its desktop authentication context to the browser.
- Use real OpenAI, OpenRouter, GitHub, Groq, xAI, SMTP, Whisper, and TTS adapters; tests stub network boundaries rather than reporting synthetic external success.
- Run WebSocket delivery in a companion Node process with persisted cursor replay and HTTP polling fallback.
- Run backups and digests in a separate scheduler process.
- Require `STAGING_URL` to select the staging target. Phase 2 uses the user-selected optimized local production instance; remote infrastructure remains separately identifiable evidence.

## Validation

Provider contracts, signed webhooks, reconnect/fallback behavior, cursor replay, offline recovery, terminal denial, reports, and route responsiveness pass locally. Standard and Hermes smoke contracts passed against the optimized production server on port 3010. Hermes appears connected in its production browser matrix with no overflow or runtime errors. External hosted-provider success remains deployment-dependent.

## Consequences

`npm run dev:full` starts the web, realtime, and scheduler processes together. Production deployments must supervise all required processes and inject credentials independently.

## See Also

- [SQLite Backend Authority](0015-sqlite-backend-authority.md)
- [Phase 2 Tracker](../todos/phase-2.md)