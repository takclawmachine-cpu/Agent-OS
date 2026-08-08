---
id: 0005-app-shell-navigation
type: decision
created: 2026-08-07
updated: 2026-08-08
phase: 1
related_tasks: ["3.1", "3.2", "3.3", "3.4", "3.5"]
status: active
tags: [app-shell, navigation, routes, project-switcher]
---

# App Shell and Navigation

## Context

Phase 1 requires a responsive shell that exposes all 27 modules, global command and notification slots, a reusable module card, and one project scope shared across every module.

## Decision

- Use a persistent Next.js App Router root shell around all module pages.
- Keep the 27 module definitions in one typed registry and statically generate a route for every slug.
- Use one shared `ModuleCard` primitive for dashboard and module surfaces.
- Put command search, notification access, theme selection, and identity in the fixed top bar.
- Keep active project and most-recent-first history in one local store; all module content reads project scope from the shell.
- Hide the switcher when no projects exist.
- Use the standalone HTML as visual input while implementing the shell in typed React components.

## Validation

- `npm run build` compiled successfully and generated 30 static pages, including all 27 module routes.
- Browser validation found 27 unique navigation destinations and no console errors.
- Command search navigated to `/terminal` and rendered the correct module heading.
- Project switching changed the shell scope to `atlas`, persisted the selection, and reordered project history.
- Dark/light theme state persisted and resolved distinct computed surface colors.
- Voice moved through idle, listening, transcribing, and idle after a timer-lifecycle fix.
- WebGL canvas validation measured 22,017 nonzero pixels at 1280 x 800.
- A 390 x 844 viewport had no horizontal overflow, a retracted mobile sidebar, and a mic center delta of -7 px.

## Consequences

Module-specific five-state behavior can now be implemented sequentially without rebuilding global navigation or project scope.

## 2026-08-08 Update

- Removed sidebar navigation from the workspace shell.
- Added split module action rails on both sides of the dashboard microphone surface.
- Module actions and command-palette module selections now open module content inside an in-shell dialog instead of full-page route navigation.

## See Also

- [Next.js Foundation](0003-nextjs-foundation.md)
- [Design System Decision](0001-design-system.md)
- [Phase 1 Tracker](../todos/phase-1.md)
