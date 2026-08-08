---
id: 0003-nextjs-foundation
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["3.1-3.5"]
status: active
tags: [nextjs, typescript, app-router, foundation]
---

# Next.js Foundation

## Context

The Phase 1 visual prototype began as a standalone HTML file. Agent OS now needs a maintainable local application before the App Shell and module routes are implemented.

## Decision

- Build the web client in `apps/web` with Next.js 16.3, React 19, TypeScript, ESLint, and App Router.
- Keep `apps/web/design-system` as the shared visual source of truth established by decision 0001.
- Use npm for local dependency and script management.
- Keep all Phase 1 data local or mocked; do not create or write to `apps/api`.
- Preserve the standalone HTML mockup as a reference rather than using it as the production runtime.

## Validation

- `npm install` completed with zero reported vulnerabilities.
- `npm run build` compiled the generated App Router scaffold and completed TypeScript validation.

## Consequences

- Phase 1 Task 3 can be implemented as typed React components and App Router routes.
- Local development runs from `apps/web` with `npm run dev`.
- Real Hermes transport remains a later gated task; environment placeholders may be documented now without implementing server-side Phase 2 behavior.

## See Also

- [Design System Decision](0001-design-system.md)
- [Phase 1 Tracker](../todos/phase-1.md)
