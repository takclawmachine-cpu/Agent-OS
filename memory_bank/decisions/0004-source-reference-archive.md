---
id: 0004-source-reference-archive
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["1.1", "3.1"]
status: active
tags: [memory-bank, references, prd, mockup]
---

# Source Reference Archive

## Context

Agents need the PRD, operating prompt, visual mockup, and supplied reference images available inside the memory bank without losing the clear source-of-truth relationship to the workspace root.

## Decision

- Store a dated baseline copy of all six supplied source artifacts in `memory_bank/references/`.
- Keep the workspace-root PRD, start prompt, HTML mockup, and images authoritative.
- Treat archived copies as immutable references; refresh them through a new logged task when source content changes.
- Keep code out of planning notes while allowing the original HTML prototype to remain an archived reference artifact.

## Validation

All source/archive pairs matched by SHA-256 after copying on 2026-08-07.

## Consequences

Agents can retrieve all original project inputs from the memory bank while avoiding silent drift between live and archived documents.

## See Also

- [Reference manifest](../references/README.md)
- [Memory Bank Foundation](0002-memory-bank-foundation.md)
- [Next.js Foundation](0003-nextjs-foundation.md)
