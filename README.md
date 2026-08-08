# Agent OS

Agent OS is a Next.js 16 App Router command center for Hermes and project agents. Phase 2 adds authoritative SQLite persistence, internal APIs, provider adapters, realtime delivery, scheduled jobs, and backend security controls.

## Run Locally

```powershell
npm ci
npm run setup
npm run config:check
npm run dev:full
```

Open [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login), sign in with the owner details entered during setup, and name the first blank workspace. Setup creates no sample data. Without valid settings, login remains disabled and background services do not start.

The setup command securely generates the password hash and session secret, then asks for one AI option. Use `npm run setup -- --force` to replace an existing local configuration. Optional GitHub, SMTP, voice, and webhook settings can be added later in `.env.local`; missing services appear as unavailable instead of blocking unrelated modules.

Installations created before the dotenv-safe password format can run `npm run setup:migrate` once. This preserves the owner password, rotates the session secret, and requires a fresh login.

## Docker

Build the image without secrets, then inject settings only when the container starts:

```powershell
docker build -t agent-os .
docker run --name agent-os --env-file .env.local -p 3000:3000 -p 8787:8787 -v agent-os-data:/app/data -v agent-os-backups:/app/backups agent-os
```

The container runs as a non-root user. SQLite and backups survive container replacement in named volumes. Starting without `--env-file` exposes only the setup-required login screen; protected access and background services remain blocked.

## VPS

```bash
git clone https://github.com/takclawmachine-cpu/Agent-OS.git
cd Agent-OS
npm ci
npm run setup
npm run config:check
npm run build
npm run start:full
```

Put TLS in front of ports `3000` and `8787`, keep `.env.local` readable only by the service account, and mount durable `data/` and `backups/` storage. A process manager such as systemd should run `npm run start:full` and restart it after failure or reboot.

To use the locally authenticated Hermes installation for AI Chat, choose Local Hermes during setup or set `HERMES_CLI_ENABLED=true`. Agent OS invokes it server-side in safe mode; see `memory_bank/docs/hermes-local.md` for the verified contract.

## Project Structure

- `src/app/` - App Router pages and global styles.
- `src/components/` - shared shell, auth, and module UI.
- `src/lib/` - API clients, module registry, authentication, and realtime contracts.
- `src/server/` - SQLite schema, migrations, provider adapters, and backend services.
- `src/state/mocks/` - legacy path containing optimistic/offline client stores; SQLite is authoritative.
- `server/` - companion realtime and scheduler processes.
- `design-system/` - shared tokens and icon registry reference.
- `memory_bank/` - indexed decisions, architecture, trackers, and project sources.
- `memory_bank/references/Agent-OS-PRD.md` - authoritative product requirements.
- `memory_bank/references/Agent-OS-Start-Prompt.md` - authoritative agent workflow.
- `memory_bank/references/AI-OS-Dashboard-Mockup.html` - original interface reference.

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

See `memory_bank/docs/hermes-local.md` for the Hermes connection contract. Every task starts with `memory_bank/index.md`, followed by `memory_bank/architecture/current-context.md`; regenerate indexes after note changes with `npm run memory:index`.
