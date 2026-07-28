# Rule Format

## Scope

- Writing or editing a rule in `agents/rules/`
- Deciding whether something belongs in a rule at all

## What belongs in a rule

- Rules describe how an agent works **in this repo**: paths, commands, gates, thresholds, holds,
  and repo-specific gotchas.
- `AGENTS.md` is the runtime entry point; it introduces the repo and points to the applicable rules.
- `CLAUDE.md` only redirects to `AGENTS.md` and holds Claude Code harness specifics.

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
