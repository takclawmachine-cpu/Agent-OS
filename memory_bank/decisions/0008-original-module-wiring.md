---
id: 0008-original-module-wiring
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12"]
status: active
tags: [modules, project-scope, mock-state, dashboard]
---

# Original Module Wiring

## Context

The first twelve Agent OS modules needed useful Phase 1 interactions while remaining local, project-scoped, and compatible with the shared shell. Dashboard aggregates also needed to come from the same records as their source modules.

## Decision

- Keep one typed `OriginalModuleState` snapshot per project in `localStorage`.
- Publish project and module change events through `useSyncExternalStore` so the shell, routes, timers, and Dashboard remain synchronized.
- Derive Dashboard mail, cron, plan, repository, agent, and token summaries from the active project's shared snapshot.
- Implement local actions for mail, cron jobs, plans, browser preview states, agents, provider checks, repositories, and AI Chat.
- Use five-second mock push updates for live work percentages and token usage while real transport remains gated to Task 10.
- Point the Vault module at real Memory Bank paths without exposing filesystem access in the browser.
- Version the project-scoped mock snapshot and migrate only known seeded Task 5 records so existing browsers show the completed plan, work item, and chat status without losing user-created data.
- Preserve Server Component route selection and cross the client boundary only by rendering `OriginalModuleView`.
- Keep the remaining fifteen module routes on their explicit Phase 1 placeholders until Tasks 6 and 7.

## Validation

- TypeScript and ESLint completed without errors or warnings.
- The production build generated all 31 pages and 27 fixed module routes.
- Mail created in Phoenix Command disappeared in Atlas Research and returned when switching back.
- Dashboard's Recent mail aggregate changed from 3 in Phoenix Command to 2 in Atlas Research.
- Scheduler add/delete, plan tab selection, preview loading, agent creation, API checking, repository removal, and AI Chat reply passed through browser interactions.
- All twelve routes rendered populated module surfaces.
- A version-1 browser snapshot migrated the Original Module Wiring plan to Approved, the Frontend Agent work item to 100%, and the Task 5 chat record to complete.
- All twelve routes at 390 x 844 had no horizontal overflow.
- Dashboard mobile telemetry and voice controls had no overlap; the measured gap between the voice hint and south telemetry card was 10.4 px.
- Browser validation caught and resolved a Server-to-Client function invocation at the route boundary.

## Consequences

The original twelve modules now form one coherent project-scoped mock product instead of independent placeholders. Later transport work can replace the storage adapter while preserving the route components and state shape.

## See Also

- [App Shell and Navigation](0005-app-shell-navigation.md)
- [Login and Onboarding](0007-login-onboarding.md)
- [Phase 1 Tracker](../todos/phase-1.md)
