---
id: 0011-empty-state-contract
type: decision
created: 2026-08-07
updated: 2026-08-08
phase: 1
related_tasks: ["8.1", "8.2"]
status: active
tags: [empty-states, modules, recovery, accessibility]
---

# Empty State Contract

## Context

All 27 modules needed consistent first-use behavior, and filtered views needed to explain that records still exist instead of looking like a new or unconfigured project.

## Decision

- Keep one typed empty-state content catalog keyed by every module slug so TypeScript rejects incomplete 27-module coverage.
- Render empty states through one shared component with an icon, concise explanation, and primary recovery action.
- Mark states as `true-empty` or `filtered-empty` in the DOM and give filtered states distinct copy, a restrained dashed treatment, and an action that clears the active filter.
- Resolve `filtered-empty` through the shared resource-state resolver only when loaded data is empty and a filter is active; errors, provider disconnection, stale data, and loading retain precedence.
- Wire true-empty branches at the data owner for mutable collections and first-use tool surfaces rather than adding route-level placeholders.
- Preserve existing populated, loading, error, and offline states; a loading redirect such as Preview App is not treated as empty.
- Make recovery actions either start the local workflow, prefill its form, generate local content, or navigate to the module that owns the missing prerequisite.

## Validation

- ESLint completed without errors or warnings, and the production build generated all 31 static pages successfully.
- A versioned empty project snapshot rendered explicit true-empty states across all mutable original, operational, and tool surfaces.
- Notifications and Search rendered `filtered-empty` states and recovered through Show All and Clear Search actions.
- The resource-state contract suite covers filtered-empty selection, populated filtered results, and loading precedence.
- Mail, API Status, Terminal, API Explorer, To-Do, Voice, Skills, Digests, Reports, and completed Onboarding recovery actions passed browser interaction checks.
- All 27 module routes had no horizontal overflow at a measured 390 x 844 viewport.

## Consequences

Every module now has typed empty-state copy and recovery metadata, while dynamic owners expose the state only when their records are actually absent. Task 9 can layer error, offline, and universal undo behavior onto the same state vocabulary without conflating those conditions with empty data.

## See Also

- [Tool Module Wiring](0010-tool-module-wiring.md)
- [Operational Module Wiring](0009-operational-module-wiring.md)
- [Phase 1 Tracker](../todos/phase-1.md)
