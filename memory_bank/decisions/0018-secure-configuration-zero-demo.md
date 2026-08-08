---
id: 0018-secure-configuration-zero-demo
type: decision
created: 2026-08-08
updated: 2026-08-08
phase: 4
related_tasks: ["2.9", "3", "4", "5", "6"]
status: active
tags: [security, authentication, configuration, zero-demo]
---

# Secure Configuration And Zero-Demo Startup

## Context

Agent OS previously allowed a fixed demo login, seeded application records, simulated realtime events, and silent fallback to a hardcoded project.

## Decision

- Block login unless owner identity, a scrypt password hash, a strong session secret, storage paths, and at least one AI option are configured server-side.
- Serialize newly generated scrypt hashes with colon delimiters so the same value survives Next.js dotenv expansion, Node loading, Docker `--env-file`, and direct VPS injection. Continue accepting legacy dollar-delimited hashes only when they arrive intact through external environment injection.
- Use the HttpOnly session cookie as the only authentication authority.
- Initialize databases with schema only and create the owner after successful configured login.
- Create the first blank workspace through authenticated onboarding.
- Never provide demo seed/reset behavior or simulated realtime data.
- Treat optional missing providers as unavailable capabilities instead of blocking login.

## Validation

At the original secure-setup checkpoint, ESLint, all 54 then-current Vitest tests, and the optimized build passed. Later regression coverage verifies parser-neutral generated hashes and legacy verification compatibility.

## Consequences

Fresh installations contain no application data before setup. Operators must complete environment configuration before login, and users see only persisted data or explicit empty/disconnected states.