# Dependency Management

## Scope

- Updating `package.json`, `pnpm-lock.yaml`, or pnpm dependencies
- Reviewing Renovate PRs or GitHub dependency alerts
- Applying security patches or routine dependency maintenance

## Shared rules

### Sources and triage

- Use Renovate as the default source of dependency update PRs; do not add Dependabot version-update
  config.
- Start dependency work from current GitHub state: check open dependency alerts and open Renovate
  PRs with `gh`.
- Re-triage open dependency PRs from fresh GitHub state each session; do not assume prior safe or
  hold buckets are still valid after merges or rebases.
- Treat GitHub dependency alerts as the security signal; prioritize critical and high severity
  first.
- Match each security update to the alert it is intended to fix: note the affected package,
  manifest, and patched version from `gh` before changing anything.
- Prefer updating an existing Renovate PR branch over changing versions by hand when Renovate
  already proposed the fix.
- If an urgent security fix has no Renovate PR yet, make the smallest targeted manual update that
  resolves the alert.

### Renovate branches

- Renovate keeps working on its own schedule and may rebase, amend, or force-push dependency
  branches while you are validating. Before pushing to a Renovate branch, run `git fetch` and
  compare to `origin/<branch>`; if the remote moved, reset to the remote branch and re-run
  verification rather than stacking local commits on a stale base.
- After merging to the default branch, expect other open Renovate PRs to be out of date or
  conflicted until Renovate rebases them.
- Before any `gh pr checkout`, verify Git transport auth works for this repo
  (`ssh -T git@github.com` for SSH remotes). If `gh` API access works but git transport does not,
  stop and report the exact blocker plus the smallest fix.

### Cooldown and upgrade order

- Apply a release-age cooldown to routine dependency updates, regardless of source, so newly
  published packages have time to surface supply-chain issues; only bypass it for urgent
  vulnerability remediation.
- `renovate.json` leaves `vulnerabilityAlerts.minimumReleaseAge` unset so security fix PRs can open
  immediately.
- For manual updates outside repo-level enforcement, prefer versions released at least 7 days ago
  unless the change is an urgent security fix.
- Prefer patch and minor upgrades before majors; do not batch unrelated major upgrades into one
  change.

### Security overrides

- Remediate a transitive advisory with a **range-scoped** pnpm override, one entry per affected
  major line — for example `"js-yaml@>=5.0.0 <=5.2.0": "^5.2.1"` alongside an existing
  `"js-yaml@>=4.0.0 <=4.1.1": "^4.2.0"`.
- Never use an unconditional pin (`"js-yaml": "5.2.1"`) and never bump an existing pin across a
  major. Both force one version on every consumer and break the other major lines.
- Expect several scoped entries per package: advisories increasingly land on multiple majors at
  once. `brace-expansion` needed `<1.1.16 -> ^1.1.16`, `>=2.0.0 <2.1.2 -> ^2.1.2` and
  `>=3.0.0 <5.0.7 -> ^5.0.7` simultaneously.
- The release-age cooldown blocks fresh security patches. When the patched version is younger than
  the cooldown, add the package to `minimumReleaseAgeExclude` with a comment naming the advisory.
- Check publish age with `npm view <pkg> time --json` before assuming an override will resolve.

### Completion

- After each dependency change, run the smallest relevant checks first, then this repo's full
  verification before marking the work complete or committing.
- Install frozen when validating a dependency change: `pnpm install --frozen-lockfile`. A bare
  `pnpm install` after editing overrides _rewrites_ the lockfile to match, so it can never detect
  `package.json` <-> lockfile drift — the command mutates the thing under test.
- If verification fails, fix compatibility issues caused by the update or stop and report the
  blocker; do not ship a broken upgrade.
- Do not assume a merged Renovate PR clears the alert; re-check GitHub alerts and local audit
  output after the update.
- Keep dependency sessions small: one security fix or one cohesive low-risk update group per commit.
- Do not suppress alerts, loosen engine ranges, or remove version holds without explicit approval.
- Summarize what changed, why it was needed, what risks remain, and which checks were run.

## This repo

- Overrides and the cooldown settings live in `pnpm-workspace.yaml`.
- Root-only pnpm package; there is no `ui/` workspace and no smoke-first policy.
- `pnpm-workspace.yaml` enforces the 7-day cooldown for direct installs and updates; keep it unless
  the operator explicitly approves a change.
- For majors, and for any Jest, ESLint, or Prettier change, check release notes and migration notes
  before applying.
- Full verification is `pnpm test` — it is the only script this repo defines.

## Examples

- Inspect alerts:
  `gh api 'repos/SYTrofimov/jira-sprint-report/dependabot/alerts?state=open&per_page=100'`
- Alert details:
  `gh api 'repos/SYTrofimov/jira-sprint-report/dependabot/alerts?state=open&per_page=100' --jq 'map({package:.dependency.package.name, manifest:.dependency.manifest_path, severity:.security_advisory.severity, fixed_in:(.security_vulnerability.first_patched_version.identifier // "none")})'`
- List Renovate PRs: `gh pr list --state open --search 'label:dependencies'`
- Re-check high vulnerabilities: `pnpm audit --audit-level=high`
- Check freshness: `pnpm outdated`
- Verify before completion: `pnpm test`
