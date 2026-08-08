# Agent OS Memory Bank

This directory is the indexed project record for current context, architecture, decisions, prompts, phase trackers, and immutable source snapshots.

## Start Every Task

1. Read `index.md`.
2. Read `architecture/current-context.md`.
3. Open only the relevant linked decision, guide, or tracker.
4. Verify the note against current code and tests before editing.

After changing an indexed note, run `npm run memory:index`.

## Structure

- `index.md` - master note index and first retrieval surface.
- `architecture/` - living system documentation.
- `decisions/` - focused architecture and implementation decisions.
- `todos/` - phase trackers derived from the PRD.
- `prompts/` and `meetings/` - task prompts and planning records.
- `versions/` - generated note snapshots.
- `logs/` - development-only sanitized reliability event records.
- `references/` - canonical PRD, start prompt, and original interface mockup.
- `docs/` - supporting operational guides.

The archived product sources live in `references/`; current behavior is defined by verified code plus active decisions. The workspace root contains application and tool configuration.
