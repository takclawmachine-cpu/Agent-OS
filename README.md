# Agent OS

Agent OS is a Next.js 16 App Router command center for Hermes and project agents. Phase 2 adds authoritative SQLite persistence, internal APIs, provider adapters, realtime delivery, scheduled jobs, and backend security controls.

## Run Locally

```powershell
npm install
Copy-Item example.env .env.local
npm run dev:full
```

Open [http://127.0.0.1:3000/dashboard](http://127.0.0.1:3000/dashboard).

To use the locally authenticated Hermes installation for AI Chat, set `HERMES_CLI_ENABLED=true`. Agent OS invokes it server-side in safe mode; see `memory_bank/docs/hermes-local.md` for the verified contract.

## Project Structure

- `src/app/` - App Router pages and global styles.
- `src/components/` - shared shell, auth, and module UI.
- `src/lib/` - API clients, module registry, authentication, and realtime contracts.
- `src/server/` - SQLite schema, migrations, provider adapters, and backend services.
- `src/state/mocks/` - legacy path containing optimistic/offline client stores; SQLite is authoritative.
- `server/` - companion realtime and scheduler processes.
- `design-system/` - shared tokens and icon registry reference.
- `memory_bank/` - indexed decisions, architecture, trackers, and source archive.
- `Agent-OS-PRD.md` - authoritative product requirements.
- `Agent-OS-Start-Prompt.md` - authoritative agent workflow.

The six files under `memory_bank/references/` are intentional immutable snapshots of the authoritative root artifacts.

## Validate

```powershell
npm run lint
npm test
npm run build
npm run smoke
npm run smoke:hermes
npm run security:dependencies
npm run security:secrets
```

`npm run smoke` targets `http://127.0.0.1:3000` by default and therefore requires `npm run dev:full` in another terminal. `npm run smoke:hermes` additionally requires a connected local Hermes instance and verifies a real chat response. Set `STAGING_URL` to validate a deployed staging environment. External provider adapters are real, but successful provider calls require their corresponding server-only credentials.

`npm install` configures the repository-managed pre-commit hook, which rejects high-confidence credentials in staged additions. GitHub Actions independently scans full Git history with Gitleaks and audits dependencies on pull requests and `main`. Trusted pull requests also receive a Vercel preview after the repository secrets in `.github/BRANCH_PROTECTION.md` are configured.

See `memory_bank/docs/hermes-local.md` for the Hermes connection contract and `AGENT.md` for the indexed task workflow.
