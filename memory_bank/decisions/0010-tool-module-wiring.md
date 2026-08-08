---
id: 0010-tool-module-wiring
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7"]
status: active
tags: [modules, tools, voice, project-scope, mock-state]
---

# Tool Module Wiring

## Context

The seven v3.1 tools needed useful Phase 1 behavior while sharing existing project records and avoiding duplicate Voice, Digest, and Browser Preview implementations.

## Decision

- Keep one shared Voice state machine for the global shell, standalone Voice, Chat, and To-Do entry points, with transcript events and response read-aloud controls.
- Store To-Do records, skill assignments, and safe Terminal history in one typed local snapshot per project.
- Support optional To-Do links to Plans and Agent Tasks, with immediate undo after deletion.
- Keep Terminal and API Explorer browser-only mocks so Phase 1 never executes host commands or external requests.
- Compose Report previews from Digest configuration and existing project summaries rather than introducing a second report data model.
- Make Preview App a shortcut that populates and opens the existing Browser Preview module.
- Defer real speech providers, shell execution, external API transport, and report export to later phases.

## Validation

- ESLint completed without errors or warnings, and the production build generated all 31 static pages successfully.
- All seven Task 7 routes rendered dedicated surfaces rather than the generic module placeholder.
- Voice completed idle, listening, transcribing, and transcript states; Chat exposed dictation and read-aloud controls.
- To-Do add, delete, and undo; Skills assignment; Terminal command interpretation; API mock response; Report preview; and Preview App redirect all passed browser interaction checks.
- All seven routes had no horizontal overflow at a measured 390 x 844 viewport.

## Consequences

Task 7 tools now provide project-scoped Phase 1 workflows while reusing existing owners for Voice, Digest composition, and Browser Preview state. Task 8 can add explicit empty-state behavior without restructuring these tool contracts.

## See Also

- [Operational Module Wiring](0009-operational-module-wiring.md)
- [Original Module Wiring](0008-original-module-wiring.md)
- [Phase 1 Tracker](../todos/phase-1.md)
