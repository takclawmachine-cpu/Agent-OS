# Connect a Local Hermes Instance

## Current Integration

Agent OS connects to local Hermes in two server-side paths:

- AI Chat invokes the authenticated Hermes CLI in safe mode with one turn, bounded output, and a timeout.
- Live module events use the Agent OS companion WebSocket service with SQLite cursor replay and HTTP polling fallback.

The browser never receives Hermes credentials and never launches a local process directly.

The intended local topology is:

```text
Next.js browser client
        |
        | ws://127.0.0.1:8787/ws
        v
Agent OS realtime bridge
        |
  +-- SQLite event log and scheduler

Next.js provider route
  |
  | server-only process invocation
  v
Authenticated local Hermes CLI
```

A browser cannot safely invoke a local CLI or stdio process directly. The provider route owns the bounded invocation and returns only the final response text.

## 1. Configure Agent OS

From the workspace root:

```powershell
Copy-Item example.env .env.local
```

```dotenv
NEXT_PUBLIC_REALTIME_MODE=real
NEXT_PUBLIC_HERMES_WS_URL=ws://127.0.0.1:8787/ws
NEXT_PUBLIC_HERMES_HTTP_URL=http://127.0.0.1:8787
NEXT_PUBLIC_HERMES_PROJECT_ID=agent-os
HERMES_CLI_ENABLED=true
HERMES_CLI_PATH=hermes
HERMES_CLI_TIMEOUT_MS=120000
```

Restart Next.js after changing environment variables.

## 2. Configure Local Hermes

Install Hermes so `hermes` is available on the server process `PATH`, or set `HERMES_CLI_PATH` to its executable. Sign in through Hermes itself; do not copy desktop cookies or provider secrets into browser-visible variables.

Agent OS invokes:

```powershell
hermes chat --safe-mode --quiet --max-turns 1 --source tool -q "..."
```

Safe mode prevents project rules, plugins, MCP servers, and tools from being loaded for browser-originated prompts. Authentication remains in Hermes' local credential store.

## 3. Shared Event Contract

Client subscription:

```json
{
  "type": "subscribe",
  "projectId": "agent-os",
  "channels": ["agents", "notifications", "status", "voice"],
  "cursor": null
}
```

Server event:

```json
{
  "id": "evt-000001",
  "type": "agent.progress",
  "projectId": "agent-os",
  "channel": "agents",
  "timestamp": "2026-08-07T07:30:00.000Z",
  "payload": {
    "agentId": "frontend-agent",
    "progress": 66,
    "state": "working"
  }
}
```

Reconnect requests include the last received event ID as `cursor`. Hermes or the bridge returns missed events before resuming live delivery. The future polling endpoint must return the same envelope array so UI subscribers do not depend on transport type.

## 4. Test the Integrations

Test local Hermes directly:

```powershell
hermes chat --safe-mode --quiet --max-turns 1 --source tool -q "Reply with exactly HERMES_CONNECTED"
```

Test Hermes through Agent OS:

```powershell
$body = @{ action = "chat"; provider = "hermes"; message = "Reply with exactly AGENT_OS_HERMES_CONNECTED" } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:3000/api/providers?projectId=agent-os -Method Post -Headers @{ "x-agent-role" = "admin" } -ContentType application/json -Body $body
```

Test realtime separately:

Install `wscat` once or run it through `npx`:

```powershell
npx wscat -c ws://127.0.0.1:8787/ws
```

Send the subscription JSON on one line. A valid service should acknowledge the project and then emit heartbeat or channel events.

Test HTTP health separately:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

Expected health response:

```json
{ "status": "ok", "service": "agent-os-realtime" }
```

## 5. Run Agent OS

```powershell
npm run dev:full
```

Open `http://127.0.0.1:3000/dashboard`.

For Task 10 end-to-end validation, confirm:

- One socket serves all live channels.
- Switching projects sends a new subscription and prevents old-project events from updating the UI.
- Stopping Hermes shows the global offline state.
- The client starts polling after the socket fails.
- Restarting Hermes reconnects and requests missed events from the last cursor.
- The UI receives the same event shape over socket and polling.

## Troubleshooting

- `hermes is not configured`: set `HERMES_CLI_ENABLED=true` and restart Agent OS.
- `ENOENT`: set `HERMES_CLI_PATH` to the installed Hermes executable.
- CLI timeout: verify Hermes authentication directly, then increase `HERMES_CLI_TIMEOUT_MS` only if the local model requires it.
- `ECONNREFUSED`: the Agent OS realtime bridge is not listening at the configured host and port.
- Browser connection fails while `wscat` works: allow the Next.js `Origin` in the bridge.
- Mixed-content failure: use `wss://` when Agent OS is served over HTTPS.
- Duplicate events after reconnect: deduplicate by event `id` and persist the latest cursor.
- Wrong project updates: verify every event and subscription includes the same `projectId`.
