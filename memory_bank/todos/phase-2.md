# Phase 2 — Database, API Connections, Backend Logic & Testing

Source: [Agent OS PRD v3.1, section 6](../../Agent-OS-PRD.md)

- [x] **1. Database Setup** — original + v3.0 entities, plus:
  - [x] 1.14 Skill catalog + Agent-Skill assignment table
  - [x] 1.15 Terminal Command Log
  - [x] 1.16 Report entity (config + output snapshot)
  - [x] 1.17 Webhook Event entity
  - [x] 1.18 Backup Record entity (metadata only)

- [x] **2. API Connections** — local Hermes, OpenAI, OpenRouter, GitHub, Groq, xAI, SMTP, Whisper STT, TTS, health checks. Hermes is verified locally; hosted adapters fail closed as unconfigured until deployment credentials are supplied.

- [x] **3. Module Migration — Original 12 + 8 from v3.0**

- [x] **4. Module Migration — 7 Modules from v3.1**
  - [x] 4.1 Voice → real STT/TTS provider calls
  - [x] 4.2 To-Do → real persisted entity, real links to Plan/Agent Task
  - [x] 4.3 Skills → real catalog + real assignment persistence
  - [x] 4.4 Terminal → real sandboxed execution
  - [x] 4.5 API Explorer → real calls against the live backend
  - [x] 4.6 Generate Report → real generation using live module data
  - [x] 4.7 Preview App → shortcut and sandboxed frame use persisted Web Browser Preview data

- [x] **5. Backend Logic**
  - [x] 5.1–5.6 Roles, conflict resolution, billing, handoff, versioning, digest
  - [x] 5.7 Real-time transport server (WebSocket + poll fallback)
  - [x] 5.8 Terminal sandboxing + command allow/deny list
  - [x] 5.9 GitHub webhook receiver + signature verification
  - [x] 5.10 Scheduled backup job (via existing Cron entity) + manual restore action
  - [x] 5.11 Whole-project data export
  - [x] 5.12 Two-stage soft-delete/hard-delete flow

- [x] **6. Testing** — local production-mode staging suite complete.
  - [x] 6.1–6.8 Unit/contract/integration, role/conflict/cap/versioning/offline tests
  - [x] 6.9 Real-time transport fallback + reconnect tests
  - [x] 6.10 Terminal sandbox/deny-list tests
  - [x] 6.11 Webhook signature verification tests
  - [x] 6.12 Backup/restore integrity tests
  - [x] 6.13 Export completeness + soft-delete recovery window tests
  - [x] 6.14 Staging smoke test
  - [x] 6.15 Re-run Phase 1 empty/error/offline checks against real backend

`6.14` passed against the user-selected optimized production target at `http://127.0.0.1:3010` through `STAGING_URL`. Both standard and Hermes smoke contracts passed; the production browser showed Hermes connected with no overflow or runtime errors. This validates production mode locally, not remote network or VPS infrastructure.

Local Hermes evidence: `npm run smoke:hermes` requires provider health to report `connected` and a routed chat response to equal `AGENT_OS_HERMES_SMOKE_OK`.
