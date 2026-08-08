# Phase 1 — UI/UX Foundation, Wiring, Design System

Source: [Agent OS PRD v3.1, section 4](../references/Agent-OS-PRD.md)

- [x] **1. Create Project Memory Bank**
  - [x] 1.1 Scaffold vault folders including `versions/`
  - [x] 1.2 Create `architecture/overview.md`
  - [x] 1.3 Create `decisions/0001-design-system.md` template
  - [x] 1.4 Wire Obsidian Vault module to real folder
  - [x] 1.5 Confirm every task logs a decision entry on completion

- [x] **2. Global Design System**
  - [x] 2.1–2.6 Color/typography/spacing/radius/motion tokens + icon registry
  - [x] 2.7 Role/permission-visibility convention
  - [x] 2.8 Notification-badge treatment
  - [x] 2.9 Voice-state treatment (idle/listening/transcribing/error)
  - [x] 2.10 Live/real-time indicator badge
  - [x] 2.11 Terminal, API Explorer, Report, and Project-folder icons

- [x] **3. App Shell & Navigation**
  - [x] 3.1 Responsive layout shell
  - [x] 3.2 Route structure for all 27 modules
  - [x] 3.3 Shared module-card primitive
  - [x] 3.4 Top-bar slots for Search/Command icon and Notification bell
  - [x] 3.5 Project Switcher in global shell (hidden/disabled if zero projects)

- [x] **4. Login & Onboarding**
  - [x] 4.1–4.4 Login states, stubbed auth, session check, error distinction
  - [x] 4.5–4.6 Resumable onboarding + decision log entry

- [x] **5. Module Wiring — Original 12**
  - [x] 5.1–5.12 Dashboard through Obsidian Vault

- [x] **6. Module Wiring — 8 Modules from v3.0**
  - [x] 6.1–6.8 Notifications through Onboarding wiring

- [x] **7. Module Wiring — 7 Modules Added in v3.1**
  - [x] 7.1 Voice (STT/TTS) — full state machine, invokable from multiple entry points
  - [x] 7.2 To-Do — dedicated list, optional links to Plan/Agent Task, undo-before-delete
  - [x] 7.3 Skills — catalog view + agent-assignment mapping
  - [x] 7.4 Terminal — console shell + mock command interpreter
  - [x] 7.5 API Explorer — request-builder shell + mock response viewer
  - [x] 7.6 Generate Report — config step + preview, reusing Digest composition logic
  - [x] 7.7 Preview App — shortcut into existing Web Browser Preview module

- [x] **8. Empty States**
  - [x] 8.1 Empty state per module, all 27
  - [x] 8.2 True-empty vs. filtered-empty distinction

- [x] **9. Error, Offline & Undo Management**
  - [x] 9.1–9.3 Field/module/app-level error patterns
  - [x] 9.4 Offline banner + auto-retry, app-wide
  - [x] 9.5 Universal undo-before-delete
  - [x] 9.6 Offline pattern explicitly applied to Voice and Terminal/API Explorer
  - [x] 9.7 Wire error/offline logging into memory bank during dev

- [x] **10. Real-Time Transport**
  - [x] 10.1 Define shared WebSocket-based transport contract
  - [x] 10.2 Mock periodic push events in Phase 1 matching this contract
  - [x] 10.3 Wire polling fallback logic (transparent to UI)
  - [x] 10.4 Wire reconnect-and-reconcile behavior into offline pattern

- [x] **11. CI/CD**
  - [x] 11.1 Lint/build pipeline
  - [x] 11.2 PR preview workflow
  - [x] 11.3 Main branch protection policy
  - [x] 11.4 Deployment secret placeholders
