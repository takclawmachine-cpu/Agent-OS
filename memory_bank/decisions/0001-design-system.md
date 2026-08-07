---
id: 0001-design-system
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["2.1-2.11"]
status: active
tags: [design-system, tokens, icons, permissions]
---

# Design System Decision

## Context

Agent OS needs one design system shared by all modules and all five UI states. The current HTML mockup is a visual reference, but Phase 1 implementation must move reusable values and behaviors into centralized tokens and primitives.

## Decision

- Centralize surface, accent, semantic status, typography, spacing, radius, elevation, and motion tokens.
- Define role and permission visibility conventions.
- Define reusable notification, voice-state, and live-state treatments.
- Keep one grouped icon registry, including Terminal, API Explorer, Report, and Project Switcher icons.
- Prohibit module-local hardcoded design values unless this decision is amended.

The implementation surface is `apps/web/design-system/`:

- `tokens.css` owns semantic dark/light theme tokens and shared state treatments.
- `icons.js` owns the SVG symbol registry on a consistent 24 px grid.
- `README.md` defines consumption, role visibility, and state contracts.
- The standalone Phase 1 mockup consumes the external stylesheet and registry.

## Status

`active`. Phase 1 checklist items 2.1–2.11 were implemented on 2026-08-07.

## Validation

- Workspace diagnostics reported no HTML, CSS, or JavaScript errors.
- Browser validation confirmed the external token stylesheet loaded from the design-system folder.
- Dark and light palettes resolved to distinct computed surface and accent values.
- All 31 referenced icon symbols resolved, including Project Folder, Terminal, API Explorer, and Report.
- Viewer role validation hid every `data-permission="write"` control.
- The voice state machine updates the shared idle, listening, and transcribing body contract; error styling is defined for failure handling.

## Consequences

- Module work depends on the shared token and icon contracts.
- Visual changes become centralized and testable.
- The existing mockup must be treated as input, not as the final component architecture.

## See Also

- [Architecture overview](../architecture/overview.md)
- [Phase 1 tracker](../todos/phase-1.md)
