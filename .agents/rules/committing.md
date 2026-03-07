# Committing

## Scope

- Creating a git commit

## Rules

- Use Conventional Commits: `<type>(<scope>): <subject>`.
- Scope is optional; use it when it adds clarity.
- Good scope examples: `repo`, `deps`, `docs`, `test`, `build`.
- Omit scope for docs-only commits: `docs: ...`.
- For dependency work, use `fix(deps): ...` for security or vulnerability fixes.
- For dependency work, use `chore(deps): ...` for routine upgrade housekeeping.
- Subject is imperative, starts lowercase, and has no trailing period.
- Keep body lines reasonably short (aim for <= 120 chars).
- Types: `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`.
- Avoid results or metrics in the subject line.
- If git hooks are configured, let them run; use `--no-verify` only if explicitly approved.

## Examples

- `feat(repo): add mass-validation helper`
- `fix: handle missing sprint changelog entries`
- `fix(deps): update axios security lockfile`
- `chore(deps): update jest to latest minor`
- `docs: clarify report usage examples`
