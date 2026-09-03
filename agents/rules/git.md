# Git

## Scope

- Creating a git commit
- Branching and pushing in this repo

## Defers to

- `superpowers:finishing-a-development-branch` — deciding between merge, PR, or cleanup once the
  work is done.
- `superpowers:verification-before-completion` — running verification before claiming a commit is
  ready.

## GitHub CLI and network access

- Use `gh` for GitHub authentication and operations. Do not use a browser as a
  fallback.
- Run `gh` only with verified GitHub network access.
- If a restricted or sandboxed environment reports an invalid or expired token,
  rerun a read-only check such as `gh api user --jq .login` with approved network
  access before diagnosing an authentication issue or changing credentials.
- Keep GitHub tokens out of command output and logs.

## Commit messages

- Use Conventional Commits: `<type>(<scope>): <subject>`.
- Types: `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`.
- Scope is optional; use it when it adds clarity.
- Good scope examples: `repo`, `deps`, `docs`, `test`, `build`.
- Omit scope for docs-only commits: `docs: ...`.
- For dependency work, use `fix(deps): ...` for security or vulnerability fixes.
- For dependency work, use `chore(deps): ...` for routine upgrade housekeeping.
- Subject is imperative, starts lowercase, and has no trailing period.
- Keep body lines reasonably short (aim for <= 120 chars).
- Avoid results or metrics in the subject line.

## Hooks and branches

- No commitlint or git hooks are configured here; the format above is enforced by review, not
  tooling.
- If git hooks are added later, let them run; use `--no-verify` only if explicitly approved.

## Examples

- `feat(repo): add mass-validation helper`
- `fix: handle missing sprint changelog entries`
- `fix(deps): update axios security lockfile`
- `chore(deps): update jest to latest minor`
- `docs: clarify report usage examples`
