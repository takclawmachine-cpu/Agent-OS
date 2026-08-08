<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent OS Task-Start Rules

Before starting any task:

1. Read `memory_bank/index.md` to find current and related decisions.
2. Read `memory_bank/architecture/current-context.md` for the concise current system state.
3. Read only the relevant linked decision, architecture note, operational guide, or phase tracker.
4. For Next.js work, also read the relevant installed guide under `node_modules/next/dist/docs/` as required above.

After changing architecture, behavior, security boundaries, or task status:

1. Update the relevant source note and phase tracker.
2. Add a focused decision note when a durable choice was made.
3. Run `npm run memory:index` to regenerate indexes.

Do not use the memory bank as a substitute for inspecting the current code or running validation. If a note conflicts with verified code, treat the code as current behavior and correct the note in the same task.
