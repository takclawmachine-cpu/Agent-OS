---
id: 0007-login-onboarding
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"]
status: active
tags: [login, authentication, onboarding, local-state]
---

# Login and Onboarding

## Context

Phase 1 requires a stubbed local authentication boundary, distinct form and connectivity failures, session checking across protected routes, and first-run onboarding that resumes after interruption.

## Decision

- Keep one mock session record in `localStorage` behind a root `AuthGate`.
- Protect every route except `/login`; unauthenticated navigation preserves the requested path in the login query.
- Use the approved demo credentials `admin@agentos.demo` and `jarvis2026`.
- Treat password `fail` as a simulated Hermes connection failure, visually separate from invalid credentials.
- Render login states for field validation, submitting, connection error, credential error, and success.
- Persist onboarding after every choice across Project, Hermes, Voice, and Review steps.
- Keep real Hermes transport gated to Task 10; onboarding records the endpoint without opening a socket.
- Apply the onboarding project name to the global Project Switcher when setup completes.
- Expose local sign-out through the shell profile.

## Validation

- ESLint completed without errors or warnings.
- The production build generated 31 static pages, including `/login` and `/onboarding`.
- Direct unauthenticated navigation to `/dashboard` redirected to shell-free `/login?next=%2Fdashboard`.
- Empty submission displayed two field errors.
- Password `fail` displayed the `Hermes is unreachable` alert and did not display the credential error.
- Invalid credentials displayed `Incorrect email or password`.
- Valid demo credentials created a session and routed to onboarding.
- Reloading at Review retained project `Phoenix Command`, WebSocket endpoint, and text-only voice preference.
- Completion routed to Dashboard and changed the global project label to `Phoenix Command`.
- Authenticated `/login` navigation bypassed Login; profile sign-out removed the session and returned to Login.
- At 390 x 844, Login had no horizontal overflow and its panel remained within the viewport.

## Consequences

The original modules can rely on one checked local session and one completed project scope. Real authorization remains a Phase 2 server responsibility.

## See Also

- [App Shell and Navigation](0005-app-shell-navigation.md)
- [Local Development and Hermes Contract](0006-local-development-hermes-contract.md)
- [Phase 1 Tracker](../todos/phase-1.md)
