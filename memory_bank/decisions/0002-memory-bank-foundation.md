---
id: 0002-memory-bank-foundation
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["1.1", "1.2", "1.3", "1.4", "1.5"]
status: active
tags: [memory-bank, indexing, workflow]
---

# Memory Bank Foundation

## Context

The PRD requires project memory to exist before feature work. The Project Start Prompt requires deterministic master and per-folder indexes generated from note frontmatter, plus exact phase trackers and a read-index-first workflow.

## Decision

- Use `memory_bank/index.md` as the first retrieval surface for every task.
- Store architecture references, sequential decisions, prompts, meetings, phase trackers, and generated versions in their prescribed folders.
- Give every architecture, decision, meeting, and prompt note the required frontmatter.
- Rebuild the master index and affected per-folder index whenever an indexed note changes.
- Record one focused decision entry and update the appropriate phase tracker after every completed task.
- Keep the Obsidian Vault mock linked to this real workspace folder.

## Consequences

- No Phase 1 implementation task starts without checking the index.
- Phase gates are visible and auditable.
- Decisions are never silently overwritten; reversals create new entries.

## Verification

- All prescribed folders exist through a navigable `_index.md` surface.
- The master index contains every frontmatter-indexed architecture, decision, and prompt note.
- Phase 1, Phase 2, and Phase 3 trackers mirror PRD sections 4, 6, and 8.
- The dashboard Obsidian Vault card resolves to the master index, architecture overview, design-system decision, and Phase 1 tracker.
- Static diagnostics report no errors in the memory bank or dashboard HTML.

## See Also

- [Architecture overview](../architecture/overview.md)
- [Archived project start prompt](../prompts/0001-project-start.md)
- [Phase 1 tracker](../todos/phase-1.md)
