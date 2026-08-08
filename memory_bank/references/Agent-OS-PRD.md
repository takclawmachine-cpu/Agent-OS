# Agent OS — Product Requirements Document

**Owner:** Harsh Malik
**Version:** 3.1 (Complete — All Identified Gaps Folded In)
**Scope of this document:** Logic, structure, and AI-agent prompts only — no code. Each build task is written so it can be handed directly to a coding agent (Codex/Claude Code) as an instruction.

**What changed in v3.1:** a second gap-recheck surfaced items still missing after v3.0 — three modules from your original PRD that were never wired (Voice, To-Do, Skills), four mockup buttons with no defined behavior (Terminal, API Explorer, Generate Report, Preview App), a missing Project Switcher, and four structural/technical decisions (real-time transport, GitHub webhooks, backup & disaster recovery, data export/deletion). All are now folded into the relevant phase. Polish-level items (accessibility, tablet breakpoint, QA reset, terms/privacy) are listed in a new **Deferred / Later** section rather than expanded into full phase detail, since they don't block core functionality.

---

## 1. Vision

A lightweight Agent OS with **Hermes** as the central orchestrator, using ChatGPT/Codex for planning and coding, with voice-first interaction, multi-agent orchestration, persistent project memory (Obsidian vault), GitHub automation, mail, and cron-driven task execution — deployable on VPS or localhost, Docker or bare-metal.

Reference UI: the two supplied dashboard mockups define the full Phase 1 baseline. As of v3.1 this is **27 modules**: the original 12, the 8 gap-driven additions from v3.0, and 7 more folded in now (Voice, To-Do, Skills, Terminal, API Explorer, Generate Report, Preview App) — plus a shell-level Project Switcher that isn't a module itself but a global control every module operates under.

---

## 2. Build Philosophy

- **Memory before features.** The project's own memory bank is scaffolded before any UI is wired.
- **Wire before decorate.** Phase 1 makes every screen state-complete (empty, loading, error, offline, populated) with mock/local data.
- **Prove before trust.** Phase 2 replaces mocks with real DB + APIs, verified by tests at each connection point.
- **Audit before ship.** Phase 3 closes the loop with secret-leak scanning, audit trails, and log retention before anything goes to a real VPS.
- **No silent gaps.** Every module defines what happens when data is missing, stale, conflicting, or permission-denied.
- **Nothing referenced without being defined.** *(NEW v3.1)* If a mockup shows a button or a PRD line names a module, it gets a state contract somewhere in this document — nothing stays a decorative label past Phase 1.

---

## 3. PHASE 1 — UI/UX Foundation, Wiring, Design System

### 3.1 Objectives
- Full clickable UI shell for all 27 modules, using local/mock state.
- Every screen has 5 defined states: **empty, loading, populated, error, offline**.
- Global design tokens and icon system, including role-awareness and voice-state treatments.
- Login page, first-run onboarding, and a **Project Switcher** in the global shell (v3.1).
- A global command bar and search shell, extended to include Terminal and API Explorer as quick actions (v3.1).
- A defined **real-time transport strategy** for every "Live" module (v3.1).
- CI/CD pipeline created early.
- Project memory bank exists before all of the above.

### 3.2 File & Folder Structure (logic only)

```
agent-os/
├── apps/
│   ├── web/
│   │   ├── modules/
│   │   │   ├── dashboard/
│   │   │   ├── mail/
│   │   │   ├── cron/
│   │   │   ├── plan-control/
│   │   │   ├── browser-preview/
│   │   │   ├── agents/
│   │   │   ├── token-usage/
│   │   │   ├── api-status/
│   │   │   ├── github/
│   │   │   ├── chat/
│   │   │   ├── memory-vault/
│   │   │   ├── auth/
│   │   │   ├── notifications/
│   │   │   ├── search/
│   │   │   ├── settings/
│   │   │   ├── onboarding/
│   │   │   ├── status/
│   │   │   ├── billing/
│   │   │   ├── digests/
│   │   │   ├── environments/
│   │   │   ├── voice/               # NEW v3.1 — STT/TTS mic flow
│   │   │   ├── todo/                # NEW v3.1 — dedicated task list
│   │   │   ├── skills/              # NEW v3.1 — skill registry
│   │   │   ├── terminal/            # NEW v3.1 — command execution shell
│   │   │   ├── api-explorer/        # NEW v3.1 — manual API test console
│   │   │   ├── reports/             # NEW v3.1 — Generate Report flow
│   │   │   └── project-switcher/    # NEW v3.1 — shell-level, not a page
│   │   ├── design-system/
│   │   ├── state/
│   │   │   └── realtime/            # NEW v3.1 — shared transport client (3.10)
│   │   └── layouts/
│   └── api/
│       └── webhooks/                 # NEW v3.1 — inbound webhook receivers (Phase 2)
├── orchestrator/
├── memory_bank/
│   ├── memory_bank/
│   ├── decisions/
│   ├── todos/
│   ├── architecture/
│   ├── meetings/
│   ├── prompts/
│   └── versions/
├── infra/
│   ├── docker/
│   ├── ci/
│   └── backup/                       # NEW v3.1 — backup/restore scripts config (Phase 3)
└── docs/
    └── prd/
```

**Rule unchanged:** nothing gets written to `apps/api` in Phase 1. Mocks live in `apps/web/state/mocks/`.

### 3.3 Global Design Tokens

All categories from v3.0 carry forward unchanged (surface/accent/status color, typography, spacing, radius/elevation, motion, role/permission-visibility). **New for v3.1:**

| Token category | Logic |
|---|---|
| **Voice state** *(NEW)* | A fixed 4-state visual treatment for the mic button — idle (static), listening (pulsing ring, matches the mockup's red waveform), transcribing (spinner/processing), error (red flash + fallback to text input) — reused anywhere voice input appears, not just the main dashboard button. |
| **Live/real-time indicator** *(NEW)* | A single consistent "live" badge treatment (small pulsing dot, matches the mockup's "Live" tag on Agent Working Status) reused on every module that has real-time data, so the user always knows which screens are live-updating vs. static. |

### 3.4 Icon Library

Unchanged core logic. v3.1 adds: a **terminal/console** icon, an **API/plug** icon for API Explorer, a **document/report** icon for Generate Report, and a **project-folder** icon for the Project Switcher — all added to the same centralized registry, grouped by function, not duplicated per module.

### 3.5 Login, Onboarding & Project Switcher

**Login & Onboarding** — unchanged from v3.0.

**Project Switcher** *(NEW v3.1)* — logic:
- Lives in the global shell (top bar, near the user profile — matches the "Harsh Malik / Admin" corner of the desktop mockup), not inside any single module, since every module is scoped to "the active project."
- Switching projects re-scopes every module's data source simultaneously — this is the same "single source of truth, no independent fetches" discipline already used by Dashboard and Status Page, just applied at the project level instead of the module level.
- If no project exists yet (fresh install before onboarding's "create first project" step), the switcher is disabled/hidden rather than showing an empty option — consistent with the role-visibility token convention (3.3).
- Recently-switched projects are remembered (most-recent-first) for faster re-switching, mirroring how the mockup's "Recent Chats" and "Recent Plans" lists work.

**Agent prompt (Task):**
> "Build a global Project Switcher in the app shell, not inside any module. Switching the active project re-scopes every module's data source at once, using the same subscribe-only pattern already used by the Dashboard. Hide/disable the switcher entirely if zero projects exist yet, rather than showing an empty state inside it. Track and surface a most-recent-first list of previously active projects."

### 3.6 Module Wiring — Original 12 Modules

*(unchanged from v2.0/v3.0 — carried forward as-is: Dashboard, Mail & SMTP, Cron Jobs, Plan Control, Web Browser Preview, Agents, Agent Working Status (Live), Tokens & Model Usage, API Connection Status, GitHub Repositories, AI Chat, Obsidian Vault)*

### 3.6b Module Wiring — 8 Modules Added in v3.0

*(unchanged: Notifications, Global Search & Command Bar, Settings & Preferences, Onboarding, Status Page, Billing & Usage Caps, Digest Shell, Environment Switcher)*

### 3.6c Module Wiring — 7 Modules Added in v3.1

21. **Voice (STT/TTS)** — the mockup's central mic button gets its own state machine, independent of any single module since it can be invoked from anywhere (global shell, Chat, To-Do quick-add). Logic: idle → tap → listening (capturing audio) → transcribing (converting to text) → either commits the text into whatever field/module invoked it, or surfaces a voice-specific error (no mic permission, silence detected, network drop during transcription — this last one uses the offline pattern from 3.8, not a generic error). TTS (text-to-speech) is the reverse path: any agent response can optionally be read aloud, toggled per-message, not forced globally.
22. **To-Do** — a dedicated list view, separate from Plan Control (which is workflow-staged) and separate from Agent tasks (which are agent-owned). Logic: To-Dos are the user's own personal/manual list — can optionally link to a Plan or Agent Task but exist independently. Empty state: "Nothing on your list." Supports the same undo-before-delete pattern (3.8) as everything else.
23. **Skills** — a registry screen listing available skills (Git, Next.js, FastAPI, Docker, SQL, Prompt Engineering, Testing, Deployment — per the original PRD) and which Agents currently have which skills assigned. Logic: Skills themselves are static/catalog data in Phase 1 (not user-editable yet); the only interactive part is the assignment mapping to Agents, which reuses the same "config form → local state" pattern as the Agents module (3.6 #6).
24. **Terminal** — the mockup's Quick Action button opens a command-execution shell. Logic in Phase 1: a visual console shell (input line + scrollback output) wired to a mock command interpreter (a small fixed set of safe mock responses) — real command execution against the actual server is explicitly a Phase 2 concern requiring its own security review (7.x), not something wired live in Phase 1.
25. **API Explorer** — the mockup's Quick Action button opens a manual API-testing console (method + endpoint + payload + response viewer) scoped to the app's own backend endpoints (not arbitrary external URLs). Logic in Phase 1: form shell + mock response viewer, matching the "no live backend yet" rule; becomes functional once Phase 2's real API layer exists.
26. **Generate Report** — the mockup's Quick Action button. Logic: opens a config step (date range, which modules to include — Agents, Tokens, GitHub, Cron) then produces a preview, reusing the same composition approach as the Digest Shell (module 19) — no separate report-building system, just a different trigger (on-demand button vs. scheduled) over the same underlying module summaries.
27. **Preview App** — the mockup's Quick Action button. Logic: this is a shortcut into the existing Web Browser Preview module (3.6 #5), not a new module — clicking it opens/focuses that module with the current project's preview URL pre-loaded. No independent state needed beyond what module 5 already defines.

### 3.7 Empty States — global rules

Unchanged core rule (icon + one-line explanation + primary action; true-empty vs. filtered-empty), now covering all 27 modules — e.g. To-Do's empty state, Skills' "no skills assigned to this agent yet" state, and Terminal's "run your first command" placeholder all follow the same contract.

### 3.8 Error Management — global rules

Unchanged from v3.0: field-level, module-level, app-level error tiers; offline state (distinct persistent banner, auto-retry on reconnect); universal undo-before-delete toast. v3.1 adds explicit application of the offline pattern to **Voice** (network drop mid-transcription is offline, not a generic error) and to **Terminal/API Explorer** (a command/request that can't reach the backend is offline, not "command failed").

### 3.9 CI/CD (Phase 1 setup)

Unchanged from v2.0/v3.0.

### 3.10 Real-Time Transport Strategy *(NEW v3.1)*

A single architectural decision, made once, governing every module tagged "Live" (Agent Working Status, Notifications, Status Page, Voice's listening state):

- **Decision logic:** use a single persistent connection (WebSocket) for all live data rather than per-module polling — one connection multiplexes updates for every live module, which is simpler to reason about, cheaper on the backend, and matches the mockup's implication of instant status changes (agent progress %, live token ticking).
- **Fallback logic:** if a WebSocket connection can't be established (proxy/network restrictions), the client falls back to short-interval polling automatically — the UI layer doesn't need to know which transport is active, it just receives the same update events either way.
- **Phase 1 behavior:** the mock layer simulates this exact event pattern (periodic pushed updates) so the UI is already built against the real eventual shape, not against a one-shot fetch that Phase 2 has to restructure.
- **Reconnect logic:** ties directly into the offline pattern (3.8) — connection loss shows the offline banner; reconnect resumes the live stream and reconciles any missed updates rather than assuming nothing changed while disconnected.

**Agent prompt (Task):**
> "Define and mock a single WebSocket-based real-time transport shared across all 'Live' modules (Agent Working Status, Notifications, Status Page, Voice listening state), with automatic polling fallback if a socket can't be established, transparent to the UI layer either way. In Phase 1, simulate this with periodic mock push events so later real-transport wiring requires no restructuring. Wire reconnect to reconcile missed updates, using the same offline banner defined for connectivity loss elsewhere in the app."

---

## 4. Phase 1 — Task Checklist

- [ ] **1. Create Project Memory Bank** *(first task)*
  - [ ] 1.1 Scaffold vault folders including `versions/`
  - [ ] 1.2 Create `architecture/overview.md`
  - [ ] 1.3 Create `decisions/0001-design-system.md` template
  - [ ] 1.4 Wire Obsidian Vault module to real folder
  - [ ] 1.5 Confirm every task logs a decision entry on completion

- [ ] **2. Global Design System**
  - [ ] 2.1–2.6 Color/typography/spacing/radius/motion tokens + icon registry
  - [ ] 2.7 Role/permission-visibility convention
  - [ ] 2.8 Notification-badge treatment
  - [ ] 2.9 **(NEW)** Voice-state treatment (idle/listening/transcribing/error)
  - [ ] 2.10 **(NEW)** Live/real-time indicator badge
  - [ ] 2.11 **(NEW)** Terminal, API Explorer, Report, and Project-folder icons

- [ ] **3. App Shell & Navigation**
  - [ ] 3.1 Responsive layout shell
  - [ ] 3.2 Route structure for all 27 modules
  - [ ] 3.3 Shared "module card" primitive
  - [ ] 3.4 Top-bar slots for Search/Command icon and Notification bell
  - [ ] 3.5 **(NEW)** Project Switcher in global shell (hidden/disabled if zero projects)

- [ ] **4. Login & Onboarding**
  - [ ] 4.1–4.4 Login states, stubbed auth, session check, error distinction
  - [ ] 4.5–4.6 Resumable onboarding + decision log entry

- [ ] **5. Module Wiring — Original 12**
  - [ ] 5.1–5.12 As previously defined (Dashboard through Obsidian Vault)

- [ ] **6. Module Wiring — 8 Modules from v3.0**
  - [ ] 6.1–6.8 As previously defined (Notifications through Onboarding wiring)

- [ ] **7. Module Wiring — 7 Modules Added in v3.1**
  - [ ] 7.1 Voice (STT/TTS) — full state machine, invokable from multiple entry points
  - [ ] 7.2 To-Do — dedicated list, optional links to Plan/Agent Task, undo-before-delete
  - [ ] 7.3 Skills — catalog view + agent-assignment mapping
  - [ ] 7.4 Terminal — console shell + mock command interpreter
  - [ ] 7.5 API Explorer — request-builder shell + mock response viewer
  - [ ] 7.6 Generate Report — config step + preview, reusing Digest's composition logic
  - [ ] 7.7 Preview App — shortcut into existing Web Browser Preview module

- [ ] **8. Empty States**
  - [ ] 8.1 Empty state per module, all 27
  - [ ] 8.2 True-empty vs. filtered-empty distinction

- [ ] **9. Error, Offline & Undo Management**
  - [ ] 9.1–9.3 Field/module/app-level error patterns
  - [ ] 9.4 Offline banner + auto-retry, app-wide
  - [ ] 9.5 Universal undo-before-delete
  - [ ] 9.6 **(NEW)** Offline pattern explicitly applied to Voice and Terminal/API Explorer
  - [ ] 9.7 Wire error/offline logging into memory bank during dev

- [ ] **10. Real-Time Transport (NEW v3.1)**
  - [ ] 10.1 Define shared WebSocket-based transport contract
  - [ ] 10.2 Mock periodic push events in Phase 1 matching this contract
  - [ ] 10.3 Wire polling fallback logic (transparent to UI)
  - [ ] 10.4 Wire reconnect-and-reconcile behavior into offline pattern

- [ ] **11. CI/CD**
  - [ ] 11.1–11.4 Lint/build pipeline, PR previews, branch protection, secret placeholders

---

## 5. PHASE 2 — Database, API Connections, Backend Logic & Testing

### 5.1 Objectives
- Replace every Phase 1 mock with real DB/API data without breaking the 5-state contract.
- Implement v3.0's backend gaps (roles, conflict resolution, billing enforcement, agent handoff, memory versioning, digest scheduling) — unchanged, carried forward.
- Implement v3.1's remaining backend gaps: real Voice provider wiring, real Terminal execution (with security gating), real API Explorer calls, real-time transport (WebSocket server), GitHub webhooks, backup & disaster recovery, and data export/deletion.

### 5.2 Database Schema — logic only

All entities from v2.0/v3.0 carry forward (User, Project, Agent, Task/Todo, Plan, Cron Job, Mail Log, Token Usage, API Connection, Audit Log, Role, Notification, Search Index Entry, Vault Note Version, Usage Cap, Digest Config, Agent Handoff Record, Environment). **New for v3.1:**

| Entity | Core relationship logic |
|---|---|
| **Skill** *(NEW)* | Catalog entity (name, category); linked to Agent via a join table (Agent-Skill assignment). Static seed data, editable later. |
| **Terminal Session/Command Log** *(NEW)* | Belongs to a User + Project; records every command executed, its output, and timestamp — this is both a functional necessity and a security-relevant log (feeds into 7.x). |
| **Report** *(NEW)* | Belongs to a Project; stores generated-report config (date range, included modules) and a snapshot of the output — so past reports remain viewable even if underlying data changes later. |
| **Webhook Event** *(NEW)* | Records inbound events from GitHub (or other providers); linked to the GitHub Repository entity; drives real-time Notification entries without needing to poll. |
| **Backup Record** *(NEW)* | Metadata only (timestamp, size, location, status) for each backup run — the backup content itself lives in infra storage, not the app DB. |

**Agent prompt (Task):**
> "Extend the schema with: a Skill catalog entity joined to Agent via an assignment table; a Terminal Command Log entity capturing every executed command per user/project; a Report entity storing both the generation config and a point-in-time output snapshot; a Webhook Event entity linked to GitHub Repository; and a Backup Record entity storing only backup metadata, not backup content."

### 5.3 API Connection Logic

Unchanged from v2.0/v3.0.

### 5.4 Multi-User & Role Enforcement

Unchanged from v3.0. **Extended:** Terminal command execution and API Explorer requests are both subject to the same role check as any other write path — a Viewer role, for instance, should not be able to run destructive terminal commands even though the UI shell exists for all roles.

### 5.5 Billing / Usage Cap Enforcement

Unchanged from v3.0.

### 5.6 Agent-to-Agent Handoff Logic

Unchanged from v3.0.

### 5.7 Memory Bank Versioning

Unchanged from v3.0.

### 5.8 Digest Scheduling

Unchanged from v3.0. Generate Report (module 26) reuses this same composition logic on-demand rather than on a schedule — no separate implementation needed.

### 5.9 Real-Time Transport — Server Side *(NEW v3.1)*

- Implements the WebSocket server side of the contract defined in 3.10: one connection per authenticated session, multiplexed across all live modules for that user's active project (ties into the Project Switcher — switching projects re-subscribes the socket to the new project's event stream).
- Falls back to exposing the same events via short-poll HTTP endpoints for clients that can't sustain a socket, so the client-side fallback logic (3.10) has something real to fall back to.

### 5.10 Voice Provider Wiring *(NEW v3.1)*

- Real STT call (Whisper) replaces the mock transcription step; real TTS call replaces the mock read-aloud step — both go through the same backend-only proxy pattern as every other provider (5.3).
- Voice-specific error states (no permission, silence, network drop) map to real conditions now instead of simulated ones, but the state machine itself (3.6c #21) doesn't change shape.

### 5.11 Terminal — Real Execution & Security Gating *(NEW v3.1)*

- Real command execution is sandboxed — runs in a constrained environment scoped to the project, not a raw shell against the host system.
- Every command and its output is written to the Terminal Command Log (5.2) before execution completes, not after, so even a crashing command leaves a record.
- A command allow/deny list is enforced server-side (destructive system-level commands blocked outright), independent of and in addition to the role check (5.4).

**Agent prompt (Task):**
> "Wire real terminal command execution through a sandboxed, project-scoped environment — never a raw host shell. Log every command and its output to the Terminal Command Log before execution completes. Enforce a server-side command allow/deny list blocking destructive system-level operations, applied on top of (not instead of) the existing role-based write enforcement."

### 5.12 GitHub Webhooks *(NEW v3.1)*

- Replaces/supplements the polling-only health check (5.3) with a real webhook receiver for GitHub events (new issue, PR opened/merged, push) — reduces latency between a real repo event and it showing up in the GitHub Repositories module and triggering a Notification.
- Webhook payloads are verified (signature check) before being trusted and written as a Webhook Event.

### 5.13 Backup & Disaster Recovery *(NEW v3.1)*

- Scheduled automated DB backups (frequency defined alongside other Cron-managed jobs, reusing the existing Cron Job entity rather than inventing a second scheduler).
- Backup Record entity (5.2) tracks metadata only; actual backup files go to infra-level storage, kept separate from the app's primary DB for recoverability.
- Restore procedure is defined as an explicit, manually-triggered admin action (never automatic) — logged as a sensitive action in the Audit Log (7.4).

### 5.14 Data Export & Deletion *(NEW v3.1)*

- Export logic covers the **whole project** (not just the vault, which already had export from the earlier gap list) — Agents, Tasks, Plans, Mail Logs, Token Usage, and Vault Notes bundled into one exportable package.
- Deletion logic: a project (or account) deletion request is soft-deleted first (recoverable window, ties into the undo pattern's spirit at the data layer) before a hard-delete job actually purges data — this protects against accidental irreversible loss while still honoring a genuine deletion request.
- Every export and deletion action is logged to the Audit Log as a sensitive action.

**Agent prompt (Task):**
> "Implement whole-project data export (Agents, Tasks, Plans, Mail Logs, Token Usage, Vault Notes bundled together) and a two-stage deletion flow: soft-delete with a recoverable window, followed by a separate hard-delete job that performs the actual purge. Log both export and deletion actions to the Audit Log as sensitive actions."

### 5.15 Testing Strategy

Same four-layer approach (unit → contract → integration → staging smoke) as v3.0, **plus v3.1 additions:**
- Real-time transport tests: simulate socket drop, assert fallback to polling and correct reconnect/reconcile behavior.
- Terminal sandboxing tests: assert denied commands are actually blocked, not just hidden in the UI.
- Webhook signature verification tests: reject unsigned/invalid payloads.
- Backup/restore tests: run an actual restore against a sandboxed environment, verifying data integrity, not just that the job "completed."
- Export/deletion tests: verify export completeness and verify the soft-delete recovery window actually works before hard-delete fires.

---

## 6. Phase 2 — Task Checklist

- [ ] **1. Database Setup** — original + v3.0 entities (unchanged from prior checklist) **plus:**
  - [ ] 1.14 **(NEW)** Skill catalog + Agent-Skill assignment table
  - [ ] 1.15 **(NEW)** Terminal Command Log
  - [ ] 1.16 **(NEW)** Report entity (config + output snapshot)
  - [ ] 1.17 **(NEW)** Webhook Event entity
  - [ ] 1.18 **(NEW)** Backup Record entity (metadata only)

- [ ] **2. API Connections** — unchanged (OpenAI, OpenRouter, GitHub, Groq, xAI, SMTP, Whisper STT, TTS, health checks)

- [ ] **3. Module Migration — Original 12 + 8 from v3.0** — unchanged from prior checklists

- [ ] **4. Module Migration — 7 Modules from v3.1**
  - [ ] 4.1 Voice → real STT/TTS provider calls
  - [ ] 4.2 To-Do → real persisted entity, real links to Plan/Agent Task
  - [ ] 4.3 Skills → real catalog + real assignment persistence
  - [ ] 4.4 Terminal → real sandboxed execution (5.11)
  - [ ] 4.5 API Explorer → real calls against the now-live backend
  - [ ] 4.6 Generate Report → real generation using live module data
  - [ ] 4.7 Preview App → confirm shortcut still targets live Web Browser Preview data

- [ ] **5. Backend Logic**
  - [ ] 5.1–5.6 As previously defined (roles, conflict resolution, billing, handoff, versioning, digest)
  - [ ] 5.7 **(NEW)** Real-time transport server (WebSocket + poll fallback)
  - [ ] 5.8 **(NEW)** Terminal sandboxing + command allow/deny list
  - [ ] 5.9 **(NEW)** GitHub webhook receiver + signature verification
  - [ ] 5.10 **(NEW)** Scheduled backup job (via existing Cron entity) + manual restore action
  - [ ] 5.11 **(NEW)** Whole-project data export
  - [ ] 5.12 **(NEW)** Two-stage soft-delete/hard-delete flow

- [ ] **6. Testing**
  - [ ] 6.1–6.8 As previously defined (unit/contract/integration, role/conflict/cap/versioning/offline tests)
  - [ ] 6.9 **(NEW)** Real-time transport fallback + reconnect tests
  - [ ] 6.10 **(NEW)** Terminal sandbox/deny-list tests
  - [ ] 6.11 **(NEW)** Webhook signature verification tests
  - [ ] 6.12 **(NEW)** Backup/restore integrity tests
  - [ ] 6.13 **(NEW)** Export completeness + soft-delete recovery window tests
  - [ ] 6.14 Staging smoke test
  - [ ] 6.15 Re-run Phase 1 empty/error/offline checks against real backend

---

## 7. PHASE 3 — Security, Leak Checks, Audit, Logs Management

### 7.1 Objectives
- Confirm no secret leaks anywhere in code, CI history, or deployed artifacts.
- Every sensitive action — including Terminal commands, backups/restores, and data export/deletion — is attributable via the Audit Log.
- Logs have defined retention, rotation, and access-control logic before this goes on a real VPS.

### 7.2 Security Checks — logic only

Unchanged core items from v2.0/v3.0 (RBAC, session logic, rate limiting, CSRF, dependency audit, environment isolation). **Extended for v3.1:**
- **Terminal security review** *(NEW)*: dedicated review of the sandbox boundary and command deny-list (5.11) — this is the single highest-risk surface introduced across all versions of this PRD, since it's the closest thing to direct system access, and gets its own explicit checklist item rather than being folded into general RBAC review.
- **Webhook endpoint hardening** *(NEW)*: signature verification (5.12) re-confirmed, plus rate limiting specific to the webhook receiver endpoint to prevent abuse via spoofed high-frequency payloads.
- **API Explorer scope check** *(NEW)*: confirm it can only target the app's own backend endpoints, never arbitrary external URLs (prevents it becoming an open proxy).

### 7.3 Secret Leak Checks

Unchanged from v2.0/v3.0: pre-commit scanning, independent CI scanning, one-time full-history scan, `.env` hygiene, rotation policy.

### 7.4 Audit Logging

Unchanged core rule (immutable, append-only). **Sensitive-action list extended for v3.1:** every Terminal command execution, every backup restore, every data export, and every deletion request (both soft and hard stages) are now explicit sensitive actions requiring dedicated review-view visibility, alongside the v3.0 list (Role changes, Usage Cap edits, Environment switches, secret rotation, permission changes, plan approval, mail send).

### 7.5 Logs Management

Same table as v3.0 (application, cron, mail, audit, notification delivery, search query logs) **plus:**

| Log type | Retention logic | Access logic |
|---|---|---|
| **Terminal command log** *(NEW)* | Longer retention than general application logs, given its security sensitivity — treated closer to Audit Log in importance. | Admin-only, reviewable alongside Audit Log. |
| **Webhook event log** *(NEW)* | Short-medium retention; useful for debugging missed/duplicate events. | Admin-only. |
| **Backup run log** *(NEW)* | Retained at least as long as the longest backup-retention policy, so backup history is auditable even after old backups are pruned. | Admin-only. |

### 7.6 Backup & Recovery Verification *(NEW v3.1)*

- Beyond the functional backup/restore built in Phase 2 (5.13), Phase 3 adds a periodic **recovery drill**: an actual restore-to-sandbox exercise on a schedule, not just a one-time test, so backup integrity is continuously verified rather than assumed.

---

## 8. Phase 3 — Task Checklist

- [ ] **1. Security Audit**
  - [ ] 1.1–1.6 As previously defined (RBAC, session, rate limiting, CSRF, dependency scan, environment isolation)
  - [ ] 1.7 **(NEW)** Terminal sandbox/deny-list dedicated security review
  - [ ] 1.8 **(NEW)** Webhook endpoint hardening (signature + rate limiting)
  - [ ] 1.9 **(NEW)** API Explorer scope check (own backend only, no open-proxy risk)

- [ ] **2. Secret Leak Checks** — unchanged from prior checklist

- [ ] **3. Audit Logging**
  - [ ] 3.1–3.3 As previously defined
  - [ ] 3.4 **(NEW)** Extend sensitive-action list: Terminal commands, backup restores, data export, deletion (soft + hard)

- [ ] **4. Logs Management**
  - [ ] 4.1–4.6 As previously defined
  - [ ] 4.7 **(NEW)** Terminal command log (extended retention)
  - [ ] 4.8 **(NEW)** Webhook event log
  - [ ] 4.9 **(NEW)** Backup run log

- [ ] **5. Backup & Recovery Verification (NEW v3.1)**
  - [ ] 5.1 Schedule periodic recovery drills (restore-to-sandbox)
  - [ ] 5.2 Log each drill's outcome to the Backup Run log

- [ ] **6. Final Pre-Launch Pass**
  - [ ] 6.1 Full regression: Phase 1 empty/error/offline checks, all 27 modules
  - [ ] 6.2 Full regression: Phase 2 contract/integration tests, all entities
  - [ ] 6.3 Sign-off entry logged to `decisions/`, closing the PRD cycle

---

## 9. Deferred / Later List *(NEW v3.1)*

Polish-level items, worth tracking but not blocking core functionality — revisit after Phase 3 sign-off:

- Accessibility pass (keyboard navigation, screen-reader labels) across all 27 modules.
- Tablet-specific breakpoint (currently only desktop and mobile are designed against).
- A QA/demo "reset mock data" button for Phase 1 development convenience.
- Terms of Service / Privacy Policy page.

---

## 10. Notes

- No code in this document — every task is meant as a natural-language instruction for a coding agent, using the **Agent prompt** blocks as starting points and the surrounding logic tables as acceptance criteria.
- Phases remain gated: Phase 2 doesn't start until Phase 1's checklist is fully checked; Phase 3 doesn't start until Phase 2's tests pass in staging.
- v3.1, like v3.0, is additive — every new module/entity composes with what already exists (Preview App reuses Web Browser Preview; Generate Report reuses Digest's composition logic; Terminal's security review extends existing RBAC rather than inventing a parallel system) rather than introducing anything standalone.
- As of v3.1, every module and button visible in the source mockups, and every module named in the original PRD text, now has a defined state contract somewhere in this document — the "nothing referenced without being defined" rule in section 2 is satisfied for this pass. Future UI additions should be checked against that same rule before being added to a mockup.
