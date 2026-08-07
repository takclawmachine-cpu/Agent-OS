# Main Branch Protection

Apply a GitHub ruleset to `main` with these settings:

- Require a pull request before merging with at least one approval.
- Dismiss stale approvals when new commits are pushed.
- Require the `quality` status check from `.github/workflows/ci.yml`.
- Require branches to be up to date before merging.
- Require conversation resolution.
- Block force pushes and branch deletion.
- Apply the ruleset to administrators.

Repository administrators must activate this policy in **Settings > Rules > Rulesets** after the repository is published. The policy cannot be enforced by a file in the working tree alone.

## Preview Secrets

Add these Actions repository secrets before enabling preview deployments:

- `VERCEL_TOKEN`: scoped deployment token.
- `VERCEL_ORG_ID`: Vercel team or account identifier.
- `VERCEL_PROJECT_ID`: linked Vercel project identifier.

Pull requests from forks skip preview deployment because GitHub does not expose repository secrets to untrusted fork workflows. CI still runs for those pull requests.