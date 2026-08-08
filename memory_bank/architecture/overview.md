---
id: overview
type: architecture
created: 2026-08-07
updated: 2026-08-08
phase: 4
related_tasks: ["1.2", "1", "2", "3", "4", "5"]
status: active
tags: [vision, modules, architecture]
---

# Agent OS Architecture Overview

## Vision

Agent OS is a lightweight, voice-first operating environment for AI-assisted project execution. Hermes is the central orchestrator, with ChatGPT/Codex supporting planning and coding, persistent project memory stored in an Obsidian-compatible vault, and integrations for agents, GitHub, mail, cron automation, and deployment to localhost or VPS environments.

## Build Philosophy

- Memory before features: establish this indexed memory bank before application work.
- Wire before decorate: Phase 1 uses local/mock data and completes every screen state.
- Prove before trust: Phase 2 replaces mocks with tested database and API integrations.
- Audit before ship: Phase 3 completes security, audit, retention, and recovery controls.
- No silent gaps: missing, stale, conflicting, denied, and offline behavior must be explicit.
- Nothing referenced without being defined: every visible control and named module has a state contract.

## Module Inventory

### Original 12

1. Dashboard
2. Mail & SMTP
3. Cron Jobs
4. Plan Control
5. Web Browser Preview
6. Agents
7. Agent Working Status (Live)
8. Tokens & Model Usage
9. API Connection Status
10. GitHub Repositories
11. AI Chat
12. Obsidian Vault

### Added in v3.0

13. Notifications
14. Global Search & Command Bar
15. Settings & Preferences
16. Onboarding
17. Status Page
18. Billing & Usage Caps
19. Digest Shell
20. Environment Switcher

### Added in v3.1

21. Voice (STT/TTS)
22. To-Do
23. Skills
24. Terminal
25. API Explorer
26. Generate Report
27. Preview App

The Project Switcher is a shell-level global control rather than a module. It re-scopes every full-workspace module to the active project. Up to four project assistant panels may remain open independently for contextual chat, voice, and status without silently changing that full-workspace selection.

## Phase Boundaries

- SQLite is authoritative for project entities; browser storage is an optimistic/offline cache.
- Fresh databases are schema-only. Secure environment configuration gates login, and onboarding creates the first blank project.
- Next.js route handlers own internal HTTP APIs and server-only provider credentials.
- A companion Node process owns multiplexed WebSocket delivery and persisted cursor replay; clients fall back to HTTP polling.
- The scheduler owns backup and digest jobs. Security-sensitive terminal, webhook, role, cap, export, recovery, and deletion behavior remains in server services.
- Project assistant context is assembled server-side from bounded, project-scoped records. Project-open commands require confirmation, and voice events carry project identity.
- Phases 1-3 are complete. Phase 4 is completing real-data, failure-state, provider-state, retry/stale-cache, multi-project realtime, and release evidence.

## Source References

- [Product Requirements Document](../references/Agent-OS-PRD.md)
- [Project Start Prompt](../references/Agent-OS-Start-Prompt.md)
- [Current task context](current-context.md)
