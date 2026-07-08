# Context

This folder is the single source of truth for how the AI agent should understand and work
on this project. `AGENTS.md` at the repo root is the only file agy loads automatically on
every prompt — everything in here is read on demand or pulled in explicitly with an
`@context/...` path reference.

- `project-overview.md` — full spec: problem, features, data model, tech stack, roadmap
- `features-documentation.md` — technical documentation of all implemented features, flows, and code links
- `coding-standards.md` — conventions and rules the agent must follow when writing code
- `ai-interaction.md` — workflow, communication style, and guardrails for working with the agent
- `current-feature.md` — living doc: what's being worked on right now, updated as you go
- `features/` — one file per feature spec, referenced when starting that feature
- `fixes/` — one file per bug/issue spec
- `research/` — background research and decision notes, written before or during a feature
- `screenshots/` — UI references for the agent to match against

## How to use this with agy

Start a feature:

> Let's start @context/features/finance-transactions.md — update current-feature.md first

Reference research before deciding an approach:

> Check @context/research/currency-handling.md before we touch the transactions schema

Point at a visual reference:

> Match the layout in @context/screenshots/kanban-board-v1.png

Keeping `current-feature.md` updated as you go is the cheapest way to keep the agent
oriented without re-explaining the whole project every session — treat it the same way
you'd hand off a status update to a new teammate.
