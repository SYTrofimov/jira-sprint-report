# AI Agent Instructions - jira-sprint-report

This document provides context for AI agents working on the jira-sprint-report project.

## Project Description

Library for calculating GreenHopper-like sprint reports based on the public Jira Cloud API.

## Architecture & Tech Stack

- Node.js library in the repository root
- Package manager: pnpm with `pnpm-lock.yaml`
- Test runner: Jest
- Tooling includes ESLint and Prettier

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
