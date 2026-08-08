# Agent OS — Project Start Prompt

This file has three parts: **(1)** the memory bank indexing scheme, **(2)** the agent operating rules, **(3)** the actual start prompt to paste into your coding agent (Codex / Claude Code / Hermes) to kick off the build. Reference document: `Agent-OS-PRD.md` (v3.1).

---

## 1. Memory Bank Indexing Scheme

The memory bank only stays useful if it's indexed, not just written to. This defines how.

### 1.1 Folder-to-purpose mapping

| Folder | Holds |
|---|---|
| `memory_bank/decisions/` | Every architecture, design, or schema decision — one file per decision. |
| `memory_bank/architecture/` | Living reference docs (overview, module contracts) — updated in place, not appended. |
| `memory_bank/todos/` | Mirrors the PRD's phase checklists as live, checkable status — not a duplicate PRD, just its current state. |
| `memory_bank/meetings/` | Notes from planning/review sessions, human or agent-initiated. |
| `memory_bank/prompts/` | Every non-trivial prompt given to an agent, kept for reuse and audit. |
| `memory_bank/versions/` | Auto-generated note version snapshots (per PRD 5.7) — agents don't write here directly. |

### 1.2 File naming convention

- `decisions/`, `meetings/`, `prompts/`: sequential, zero-padded, slugged — `0001-design-system.md`, `0002-realtime-transport-choice.md`. Numbers never reused, even if a decision is later reversed (the reversal is a new entry that references the old one).
- `architecture/`: named by subject, not sequence — `overview.md`, `module-contracts.md`, `schema.md` — since these are living documents, not a log.
- `todos/`: one file per phase — `phase-1.md`, `phase-2.md`, `phase-3.md` — mirroring the PRD checklist structure exactly, so status can be diffed against the PRD at a glance.

### 1.3 Required frontmatter (every note)

Every note in `decisions/`, `architecture/`, `meetings/`, and `prompts/` starts with:

```
id: <sequential id or filename slug>
type: decision | architecture | meeting | prompt
created: <ISO date>
updated: <ISO date, same as created until first edit>
phase: 1 | 2 | 3 | n/a
related_tasks: [<PRD checklist references, e.g. "5.4", "6.1">]
status: proposed | active | superseded | reversed
tags: [<free-form>]
```

This is what makes the index buildable — the index is generated *from* frontmatter, never maintained as a separate hand-written source of truth.

### 1.4 The index itself

- `memory_bank/index.md` — the master index. One table, one row per note across every folder, columns: `type | id | title | phase | related_tasks | status | updated | link`. Sorted by `updated` descending, so the newest activity is always at the top.
- `memory_bank/decisions/_index.md`, `memory_bank/architecture/_index.md`, etc. — one lightweight per-folder index each, same columns, scoped to that folder — useful when an agent only needs decisions, not everything.
- **Regeneration rule:** the index is never hand-edited directly. It is rebuilt from frontmatter every time a note is added, edited, or its status changes. This is a deterministic, mechanical step — not a judgment call — so it can be done by any agent, every time, without drift.

### 1.5 Retrieval rule for agents

Before starting *any* task, an agent reads `memory_bank/index.md` first (not the whole vault) to check: has this been decided before, is there a related in-progress note, is anything marked `superseded` that shouldn't be repeated. Only if the index points to something relevant does the agent open the full note.

---

## 2. Agent Rules for This Project

These apply to every agent working on Agent OS — Hermes, sub-agents, and any coding agent (Codex/Claude Code) invoked directly. They are constraints, not suggestions.

1. **Read the index before acting.** Every task starts with `memory_bank/index.md`, per 1.5. Never start from a blank assumption if a relevant decision already exists.
2. **Phase-gate discipline.** Do not start Phase 2 work while Phase 1's checklist (`todos/phase-1.md`) has unchecked items, and do not start Phase 3 while Phase 2 is incomplete — this mirrors the PRD's own Plan Control workflow rule.
3. **PRD is the contract.** Before writing anything for a module, re-check that module's logic section in `Agent-OS-PRD.md` — do not invent behavior the PRD doesn't define. If something's genuinely missing, log a decision note proposing the addition rather than silently improvising.
4. **No code in planning artifacts.** The PRD, memory bank notes, and this file stay logic/prompt-only. Code lives in `apps/` and `orchestrator/`, nowhere else.
5. **Never touch `apps/api` during Phase 1.** Per PRD 3.2 — mocks only, in `apps/web/state/mocks/`.
6. **No hardcoded values outside the design-token set.** Any color, spacing, radius, or motion value not sourced from `design-system/` is a bug, not a style choice.
7. **Every screen honors the 5-state contract.** Empty, loading, populated, error, offline — a module isn't "done" until all five are addressed, per PRD 3.1/3.7/3.8.
8. **Security defaults are non-negotiable.** Backend-only API keys, server-side role checks (never UI-only), sandboxed Terminal execution — these are hard constraints from the PRD, not defaults to be relaxed for speed.
9. **Update the memory bank after every change — not before moving to the next task.** See section 3 below for the exact procedure. This is the single most-violated rule in most agent workflows, so it's stated twice: once here, once as its own section.
10. **Ambiguity gets logged, not guessed silently.** If a task is underspecified, write a short `decisions/` note framing the ambiguity and the assumption being made, status `proposed`, so a human can correct it later without archaeology.
11. **Destructive actions confirm first.** Anything matching the PRD's undo-before-delete pattern (module deletes, project deletes, hard-delete jobs) requires the same caution from agents as from the UI — no silent irreversible action.
12. **One task, one commit, one memory bank entry.** Don't batch unrelated changes into a single commit or a single decision note — traceability breaks down otherwise.

---

## 3. Rule: Always Update the Memory Bank After Changes

This is the enforcement procedure behind rule 9 above. Every agent follows this exact sequence after completing any task — code change, schema change, design decision, or PRD-checklist item:

1. **Write the note** in the correct folder (per 1.1), using the correct naming convention (1.2) and complete frontmatter (1.3). Status starts as `active` unless it's explicitly provisional (`proposed`).
2. **Update the relevant `todos/phase-N.md` file** — check off the completed checklist item, referencing the PRD's exact checklist numbering (e.g. "5.4 Plan Control") so it stays traceable back to `Agent-OS-PRD.md`.
3. **Regenerate the index** — `memory_bank/index.md` and the relevant per-folder `_index.md`, per 1.4. This step is mechanical, not optional, and happens every time — it's what keeps rule 1 (read the index first) trustworthy for the next task.
4. **Cross-link.** If the new note relates to an existing one (extends it, reverses it, depends on it), add that reference in `related_tasks` or a short "See also" line — the vault should read as a connected graph, not a pile of isolated files.
5. **Only then** is the task considered complete and the agent moves on.

If an agent's output doesn't include steps 1–4, the task is not finished — regardless of whether the code/design itself works.

---

## 4. The Start Prompt

Paste the block below into your coding agent to begin the project. It assumes `Agent-OS-PRD.md` and this file are both accessible to the agent (same repo/workspace).

```
You are starting a new project called Agent OS. Two reference documents are
available to you: Agent-OS-PRD.md (the full product requirements document,
v3.1) and Agent-OS-Start-Prompt.md (this file, containing memory bank
indexing rules and agent operating rules).

Before writing any code:

1. Read Agent-OS-PRD.md in full, particularly sections 3 and 4 (Phase 1).
2. Read the Agent Rules and Memory Bank Indexing sections of
   Agent-OS-Start-Prompt.md and treat them as binding constraints for
   every task you perform on this project, not just the first one.

Your first task is PRD checklist item 1: "Create Project Memory Bank."
Specifically:

- Scaffold the memory_bank/ folder structure exactly as defined in PRD
  section 3.2: memory_bank/, decisions/, todos/, architecture/, meetings/,
  prompts/, versions/.
- Create memory_bank/architecture/overview.md summarizing the PRD's vision,
  build philosophy, and the full module list (27 modules).
- Create memory_bank/decisions/0001-design-system.md as a template decision
  note, using the frontmatter schema from the Start Prompt's indexing
  section.
- Create memory_bank/todos/phase-1.md, phase-2.md, and phase-3.md,
  mirroring the exact checklist structure from PRD sections 4, 6, and 8 —
  every item unchecked at this point except item 1, which you are about to
  complete.
- Build memory_bank/index.md and the per-folder _index.md files, even
  though they will only have a few entries right now — the indexing
  mechanism itself must exist from this first task onward, not be added
  later.

Once the memory bank exists, follow this exact sequence, and do not skip
ahead:

- Complete PRD Phase 1 checklist items in order (sections 4.2 through 4.11),
  updating memory_bank/todos/phase-1.md and regenerating the index after
  every single item, per the "Always Update the Memory Bank After Changes"
  procedure.
- Do not begin any Phase 2 work until every Phase 1 checklist item is
  checked off in memory_bank/todos/phase-1.md.
- For every module you build, re-read that module's specific logic section
  in Agent-OS-PRD.md immediately before starting it — do not rely on
  memory of the PRD from earlier in the session.
- If you encounter anything the PRD does not define clearly enough to
  proceed, stop and write a memory_bank/decisions/ note describing the
  ambiguity and your proposed assumption, marked status: proposed, instead
  of guessing silently and continuing.

Confirm you have read and understood these instructions, then begin with
memory bank scaffolding.
```

---

## 5. Notes

- This file is a companion to `Agent-OS-PRD.md`, not a replacement for any part of it — the PRD remains the single source of truth for module logic; this file governs *how* agents work, not *what* they build.
- If the memory bank indexing scheme or agent rules need to change later, that change is itself logged as a decision note in `memory_bank/decisions/`, same as any other project decision — this file isn't exempt from the rules it defines.
