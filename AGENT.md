# Agent OS Agent Rules

These rules apply to every coding agent working in this repository.

1. Read `memory_bank/index.md` before every task.
2. Follow `Agent-OS-PRD.md` as the product contract and `Agent-OS-Start-Prompt.md` as the execution contract.
3. Complete Phase 1 tasks in order. Do not start Phase 2 while `memory_bank/todos/phase-1.md` has unchecked items.
4. Do not create a backend API during Phase 1. Keep data local or mocked under `src/state/mocks`.
5. Use `design-system/tokens.css` for visual values. Do not create module-local color, spacing, radius, or motion systems.
6. Every completed task gets one focused decision note, the relevant tracker update, and regenerated master/per-folder indexes.
7. Before writing Next.js code, consult the installed version documentation under `node_modules/next/dist/docs/`.
8. Keep interactive browser APIs in Client Components and default pages/layouts to Server Components.
9. Never expose API keys or Hermes credentials through `NEXT_PUBLIC_*` environment variables.
10. Real Terminal execution, arbitrary API requests, authentication enforcement, and Hermes server transport are not Phase 1 shortcuts.

## Commands

From the workspace root:

```powershell
npm run dev
npm run lint
npm run build
```

## Current Gate

Phase 1 Tasks 1-5 are complete. The next PRD implementation task is Task 6, Module Wiring for the eight modules introduced in v3.0.
