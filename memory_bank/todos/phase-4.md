# Phase 4 — Data Truth, Errors, Disconnected APIs & Empty States

Source: Post-Phase-3 runtime-state audit, 2026-08-07.

Goal: A module must never present demo, cached, or fallback content as live backend data. Every card must distinguish loading, empty, populated, unconfigured, disconnected, error, and stale states, with an appropriate recovery action.

- [x] **1. Resource State And Provenance Contract**
  - [x] 1.1 Define shared `ResourceState<T>` variants: idle, loading, ready-empty, ready-populated, unconfigured, disconnected, error, and stale
  - [x] 1.2 Define precedence rules so disconnected/error cannot collapse into empty or populated
  - [x] 1.3 Preserve provider status distinctions from server to UI: connected, unconfigured, unreachable, degraded, and error
  - [x] 1.4 Attach source, last-success timestamp, retryability, and stale metadata to resource results
  - [x] 1.5 Distinguish browser connectivity, Agent OS API health, realtime transport, and external-provider health
  - [x] 1.6 Add contract tests for every state transition and precedence rule

- [ ] **2. Mock And Seed Data Cleanup**
  - [x] 2.1 Classify every seed as system default, explicit demo, user data, or test fixture
  - [x] 2.2 Replace populated original-module client fallbacks with neutral loading/empty defaults
  - [x] 2.3 Remove demo notifications and digest history from operational client defaults
  - [x] 2.4 Remove demo To-Dos, assignments, and Terminal output from tool client defaults
  - [x] 2.5 Remove operational demo agents, plans, repositories, chat, mail, usage, and notifications from fresh SQLite seeding
  - [x] 2.6 Add an idempotent migration that removes only known demo records from existing databases
  - [x] 2.7 Preserve required system defaults: local user/project, preferences, caps, skill catalog, preview config, and backup schedule
  - [ ] 2.8 Replace static project, Vault, Search, Environment, and Skill UI datasets with backend responses
  - [ ] 2.9 Move demo population into an explicit development-only seed/reset command

- [ ] **3. Error Management Architecture**
  - [x] 3.1 Add a typed `ApiError` carrying status, code, retryability, source, and a safe user message
  - [x] 3.2 Add centralized timeout, abort, JSON-parse, and network-failure handling to the API client
  - [x] 3.3 Stop swallowing hydration and persistence failures in all three state stores
  - [ ] 3.4 Add optimistic mutation rollback, retry, and stale-data marking
  - [x] 3.5 Handle `401`, `403`, `409`, `413`, `429`, provider `503`, and unexpected `5xx` distinctly
  - [x] 3.6 Standardize field errors, card/module errors, route errors, and global errors with accessible status text
  - [ ] 3.7 Add retry actions that rerun the failed operation rather than only clearing UI flags
  - [x] 3.8 Make shell health text derive from API, realtime, and provider state; never show nominal while a required dependency is unavailable

- [ ] **4. Relevant API-Not-Connected Card States**
  - [x] 4.1 Create reusable `ApiNotConnectedState` and `StaleDataNotice` components
  - [ ] 4.2 Convert Dashboard provider health and Status/API Status cards
  - [x] 4.3 Convert Mail compose and delivery cards for SMTP configuration/reachability
  - [ ] 4.4 Convert Agent Working Status cards for realtime transport availability
  - [ ] 4.5 Convert Tokens and Billing cards for hosted-model provider availability
  - [ ] 4.6 Convert GitHub repository cards for API and webhook availability
  - [x] 4.7 Convert AI Chat cards for Hermes/provider availability
  - [ ] 4.8 Convert Voice cards independently for microphone permission, Whisper STT, and TTS availability
  - [ ] 4.9 Disable dependent actions while disconnected and expose the correct configure, retry, or reconnect action

- [ ] **5. Complete Empty-State Matrix For All 27 Modules**
  - [ ] 5.1 Add one state resolver that separates loading, true-empty, filtered-empty, populated, disconnected, error, and stale
  - [ ] 5.2 Complete Dashboard, Mail, Cron, Plans, and Browser Preview state branches
  - [ ] 5.3 Complete Agents, Agent Status, Tokens, API Status, GitHub, Chat, and Vault state branches
  - [ ] 5.4 Complete Notifications, Search, Settings, Onboarding, Status, Billing, Digests, and Environments state branches
  - [ ] 5.5 Complete Voice, To-Do, Skills, Terminal, API Explorer, Reports, and Preview App state branches
  - [ ] 5.6 Make Search and list filters use filtered-empty without replacing the true-empty state
  - [ ] 5.7 Ensure zero usage, zero notifications, and no provider configuration are represented as different states
  - [ ] 5.8 Ensure cached content remains visible only with an explicit stale indicator and timestamp
  - [ ] 5.9 Give every empty/disconnected/error state one relevant recovery or creation action
  - [ ] 5.10 Verify state text, focus order, live regions, and disabled controls are accessible

- [ ] **6. Migration, Regression And Release Evidence**
  - [x] 6.1 Add fresh-database tests proving no operational demo records are created
  - [x] 6.2 Add migration tests proving known demos are removed without deleting user-created records
  - [ ] 6.3 Add provider-status contract tests from adapter through route persistence to card rendering
  - [ ] 6.4 Add hydration, timeout, offline, stale-cache, and failed-mutation rollback tests
  - [ ] 6.5 Add a table-driven state-selection test covering all 27 modules
  - [x] 6.6 Add browser checks for disconnected and empty states on desktop and mobile
  - [x] 6.7 Run lint, full tests, optimized build, standard smoke, Hermes smoke, and production smoke
  - [x] 6.8 Record the migration/reset procedure and Phase 4 completion decision

## Counts

- Completed task groups: 1
- Pending task groups: 5
- Completed subtasks: 26
- Pending subtasks: 24
- Modules requiring state-matrix verification: 27

## Seed Classification

- System defaults: local user and project, preferences, usage cap, digest configuration, preview configuration, skill catalog, and backup schedule.
- User data: all agents, plans, repositories, conversations, mail logs, usage, notifications, To-Dos, assignments, and terminal history created after initialization.
- Test fixtures: records created explicitly inside Vitest setup and removed with the test database.
- Demo data: no operational demo records are created by normal startup; legacy rows are removed only when their IDs and original content still match.

## Migration Note

Opening an existing database runs the idempotent legacy cleanup during initialization. Modified seed records and records referenced by user-created relationships are retained. Client cache schema versions invalidate old populated fallback state and then rehydrate from SQLite.

## Release Decision

Phase 4 remains in progress. This checkpoint is safe to publish after lint, 47 tests, optimized build, standard production smoke, Hermes production smoke, and desktop/mobile browser checks passed. An explicit development demo seed/reset command remains intentionally pending under 2.9; normal startup never repopulates demo records.
