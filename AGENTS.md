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

For each user request, determine applicable rules from the table below and follow them before making changes.

### Rules Table Of Contents with Scopes

- `.agents/rules/dependency-management.md` - Updating dependencies, lockfiles, Renovate PRs, or dependency alerts
- `.agents/rules/committing.md` - Creating a git commit

## Key Documentation

- `README.md` - Setup, usage examples, and test instructions
