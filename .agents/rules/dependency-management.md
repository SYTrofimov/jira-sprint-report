# Dependency Management

## Scope

- Updating `package.json`, `pnpm-lock.yaml`, or pnpm dependencies
- Reviewing Renovate PRs or GitHub dependency alerts
- Applying security patches or dependency maintenance changes

## Rules

- Use Renovate as the default source of dependency update PRs; do not add Dependabot version-update config.
- Start dependency work with GitHub state: check open dependency alerts and open Renovate PRs with `gh`.
- Treat GitHub dependency alerts as the security signal; prioritize critical and high severity fixes first.
- Match each security update to the alert it is intended to fix: note the affected package, manifest, and patched version from `gh` before changing anything.
- Prefer updating an existing Renovate PR branch over changing versions by hand when Renovate already proposed the fix.
- If an urgent security fix has no Renovate PR yet, make the smallest targeted manual update that resolves the alert.
- Apply a release-age cooldown to routine dependency updates, regardless of source, so newly published packages have time to surface supply-chain issues; only bypass it for urgent vulnerability remediation.
- `pnpm-workspace.yaml` enforces a 7-day cooldown for direct installs and updates; keep that setting in place unless the user explicitly approves a change.
- For manual dependency updates outside repo-level enforcement, prefer versions released at least 7 days ago unless the change is an urgent security fix.
- Prefer patch and minor upgrades before majors; do not batch unrelated major upgrades into one change.
- For major upgrades or changes to Jest, ESLint, Prettier, or core runtime dependencies, check release notes and migration notes before applying.
- Do not assume a merged or applied Renovate PR clears the alert; verify after the update by re-checking GitHub alerts and local audit output.
- After each dependency change, run the smallest relevant checks first, then run `pnpm test` before marking the work complete or committing.
- If verification fails, fix compatibility issues caused by the update or stop and report the blocker; do not ship a broken upgrade.
- Keep dependency sessions small: complete one security fix or one cohesive low-risk update group per commit, then stop for a fresh session unless the user asks to continue.
- After a dependency change passes verification and the user asked for a commit, create the commit and stop at that checkpoint instead of continuing with more updates automatically.
- Do not suppress alerts or loosen constraints just to make an update pass without explicit approval.
- Summarize what changed, why it was needed, what risks remain, and which checks were run.

## Examples

- Inspect alerts: `gh api 'repos/SYTrofimov/jira-sprint-report/dependabot/alerts?state=open&per_page=100'`
- Inspect alert details: `gh api 'repos/SYTrofimov/jira-sprint-report/dependabot/alerts?state=open&per_page=100' --jq 'map({package:.dependency.package.name, manifest:.dependency.manifest_path, severity:.security_advisory.severity, fixed_in:(.security_vulnerability.first_patched_version.identifier // "none")})'`
- List Renovate PRs: `gh pr list --state open --search 'label:dependencies'`
- Re-check high vulnerabilities: `pnpm audit --audit-level=high`
- Check freshness: `pnpm outdated`
- Verify before completion: `pnpm test`

## Renovate config notes

- `pnpm-workspace.yaml` enforces the general 7-day cooldown for direct `pnpm` installs and updates.
- `renovate.json` enforces the general 7-day cooldown for routine Renovate updates and leaves `vulnerabilityAlerts.minimumReleaseAge` unset so security fix PRs can still open immediately.
