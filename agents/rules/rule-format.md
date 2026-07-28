# Rule Format

## Scope

- Writing or editing a rule in `agents/rules/`
- Deciding whether something belongs in a rule at all, and in which tier

## Always-on versus on-demand

There are two tiers, and putting a rule in the wrong one makes it silently ineffective.

- **Always-on → inline it in `AGENTS.md`.** Use this when the rule has no trigger: it constrains
  every turn, or its trigger is something the agent does on its own rather than something the user
  asks for. A rule that must fire without a matching request cannot live in `agents/rules/`.
- **On-demand → a file in `agents/rules/`.** Use this when a `Scope` can name the situation that
  brings the rule into play — editing a doc, cutting a commit, deploying, updating a dependency.
  The agent matches `Scope` against the task and reads the file then.
- The test: **can you write a `Scope` that a user request would match?** If not, it is always-on.
- Keep the always-on section short. Everything inlined there is paid for on every turn, and a long
  list dilutes the rules that matter.
- `AGENTS.md` is the runtime entry point; it carries the always-on rules and points to the rest.
- `CLAUDE.md` only redirects to `AGENTS.md` and holds Claude Code harness specifics.

## What belongs in a rule

- Rules describe how an agent works **in this repo**: paths, commands, gates, thresholds, holds,
  and repo-specific gotchas.

## What does not belong in a rule

- Do not restate generic engineering process that a superpowers skill already owns: TDD,
  root-cause debugging, brainstorming before creative work, writing and executing plans, code
  review, finishing a branch, and evidence-before-completion.
- Name the owning skill in a `## Defers to` section instead, then keep only the repo-specific facts.
- A bullet earns its place only if deleting it would lose a repo-specific fact.

## General rules

- Use short bullets and concrete verbs.
- Prefer single-responsibility rules; link out instead of duplicating.
- Use inline examples with backticks like `pnpm verify`.
- Keep each bullet self-contained; avoid nested bullets.
- Avoid policy debates or rationale dumps; include only what guides action.
- If a rule depends on another file, name it directly (example: "See `verification.md`").

## File structure

- Start with `## Scope` so the `AGENTS.md` table of contents can quote it.
- Add `## Defers to` when a superpowers skill owns the surrounding workflow.
- Beyond that there is no fixed template; use headings only when they group related bullets.
