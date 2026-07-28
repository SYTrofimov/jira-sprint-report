# AI Agent Instructions - jira-sprint-report

This document provides context for AI agents working on the jira-sprint-report project.

## Project Description

Library for calculating GreenHopper-like sprint reports based on the public Jira Cloud API.

## Architecture & Tech Stack

- Node.js library in the repository root
- Package manager: pnpm with `pnpm-lock.yaml`
- Test runner: Jest
- Tooling includes ESLint and Prettier

## Always-on rules

These apply to **every** turn and have no trigger — do not wait for a matching request. Everything
in `agents/rules/` is on-demand by contrast: consulted when its `Scope` matches the task at hand.

- **Harness memory is for host-specific facts only.** Never write repo-wide knowledge to an agent's
  own memory store: operator decisions, deployment facts, product direction, architecture,
  gotchas, commands, version holds, release history.
- The test: **would this fact still be true for someone else who cloned this repo?** If yes it
  belongs in this repo, in the doc that owns it. Memory is only for what is true of _this machine_ —
  local tool versions and global CLI state, shell configuration, SSH agent state, local paths.
- Memory is invisible in a diff, invisible to other agent runtimes, and absent from a fresh clone.
  That is the reason for the rule, not a style preference.
- Treat a recalled memory that states a repo fact as stale by default: verify it against the repo
  before acting, then move the fact into the owning doc here.

## Rules

**IMPORTANT:** `AGENTS.md` is the runtime entry point for agent instructions in this repo.
`CLAUDE.md` only redirects here and holds Claude Code harness specifics.

For each user request, determine applicable rules from the table below and follow them before making changes.

Rules cover what is specific to this repo. Generic engineering process — TDD, root-cause debugging,
brainstorming, writing and executing plans, code review, finishing a branch,
evidence-before-completion — is owned by the superpowers skills, and rule files name the owning
skill in a `Defers to` section instead of restating it.

### Rules Table Of Contents with Scopes

- `agents/rules/dependency-management.md` - Updating dependencies, lockfiles, Renovate PRs, or dependency alerts
- `agents/rules/git.md` - Creating a git commit, branching, pushing
- `agents/rules/rule-format.md` - Rule-writing format for `agents/rules/`

## Key Documentation

- `README.md` - Setup, usage examples, and test instructions
