---
id: 0014-ci-cd-foundation
type: decision
created: 2026-08-07
updated: 2026-08-07
phase: 1
related_tasks: ["11.1", "11.2", "11.3", "11.4"]
status: active
tags: [ci, deployment, github, vercel]
---

# CI/CD Foundation

## Context

Phase 1 requires repeatable quality gates, pull-request previews, protected integration, and credential placeholders before remote publication.

## Decision

- Run `npm ci`, ESLint, and the production build on every pull request and every push to `main` in the required `quality` job.
- Deploy trusted pull requests to Vercel and maintain one preview-link comment per pull request.
- Skip preview deployment for forks because GitHub correctly withholds repository secrets; the quality workflow still runs.
- Require one approval, current `quality`, resolved conversations, and protection from force pushes or deletion on `main`.
- Keep deployment credentials exclusively in GitHub Actions secrets named `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

## Validation

- Workflow and policy files have no editor diagnostics.
- Local execution of the same lint and build gates passed.
- Branch-rule activation is documented for repository administrators because this workspace has no Git repository or GitHub remote to configure.

## Consequences

The repository has a reviewable automation contract ready for publication. Preview deployment and branch enforcement begin after an administrator adds the documented secrets and activates the `main` ruleset.

## See Also

- [Main Branch Protection](../../.github/BRANCH_PROTECTION.md)
- [Phase 1 Tracker](../todos/phase-1.md)