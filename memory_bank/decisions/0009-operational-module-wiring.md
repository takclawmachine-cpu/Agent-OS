---
id: 0009-operational-module-wiring
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8"]
status: active
tags: [modules, operations, project-scope, mock-state]
---

# Operational Module Wiring

## Context

The eight v3.0 operational modules needed useful Phase 1 behavior without duplicating records already owned by the original modules or bypassing the existing resumable Onboarding flow.

## Decision

- Keep Notifications, preferences, usage caps, Digest configuration/history, and the active Environment in one typed local snapshot per project.
- Derive Search results from the module registry and indexed project knowledge instead of maintaining a second route index.
- Derive Status Page health and Billing usage from the original module store so provider, scheduler, and token values remain consistent.
- Keep Onboarding on its existing shell-free, resumable route and count that implementation as the eighth Task 6 surface.
- Synchronize unread Notifications, compact density, and active Environment back into the global shell.
- Keep real notification transport, billing enforcement, Digest scheduling, and environment deployment gated to later tasks and Phase 2.
- Delay AuthGate redirects until client hydration has read the persisted session, preserving authenticated hard navigation to every module.

## Validation

- ESLint completed without errors or warnings.
- All eight Task 6 routes rendered real surfaces rather than the generic module placeholder.
- Mark-all-read removed the shell notification badge; Search found Billing; compact density reached the shell; Status derived live module health; Billing saved a new cap; Digest generation appended persisted history; Environment activation updated both module and shell; Onboarding remained resumable.
- Authenticated hard navigation remained on every operational route after hydration.
- All eight routes had no horizontal overflow at a measured 390 x 844 viewport.

## Consequences

Task 6 modules now share project scope and existing source records while exposing clear local interactions. Task 7 can add the final seven tools without restructuring these operational contracts.

## See Also

- [Original Module Wiring](0008-original-module-wiring.md)
- [Login and Onboarding](0007-login-onboarding.md)
- [Phase 1 Tracker](../todos/phase-1.md)