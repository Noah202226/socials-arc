# Social Media PM SaaS — Agent Instructions

This file is always loaded by agy on every prompt. Keep it short — detailed knowledge
lives in context/, read on demand, not duplicated here.

## Always read on startup

@context/project-overview.md
@context/features-documentation.md
@context/coding-standards.md
@context/ai-interaction.md
@context/current-feature.md

## On-demand context

- Starting a feature? Read the matching file in context/features/ first.
- Fixing a bug? Read the matching file in context/fixes/ first.
- Unsure about an approach (currency handling, scheduling, auth pattern)? Check
  context/research/ before starting from scratch — and write new findings there when done.
- **Automatic UI References**: Always check the `context/screenshots/` directory for visual reference images or inspiration designs before building or modifying any UI/styling. Automatically align spacing, theme color palettes, and visual layouts to match those designs, even if not explicitly requested in the prompt.

## Cache-first policy

Don't re-read the full convex/schema.ts or scan the whole codebase for every task.
context/current-feature.md names what's active and which files it touches — start there,
and only widen the search if it doesn't cover what you need.

## Stack quick reference

Next.js 15 (App Router) + shadcn/ui + Convex (database, realtime queries, file storage,
scheduled functions) + Clerk (auth). Full detail: context/project-overview.md

## Non-negotiables

- Currency amounts are always integers in cents — never floats.
- Every Convex table needs at least one .index() matching how it's actually queried.
- Never modify convex/schema.ts without checking which existing queries depend on the
  field being changed.
- Client-facing routes under app/share/ must never assume an authenticated session.
- Before editing or creating any React UI components or styling configurations, you MUST search the `context/screenshots/` directory for matching layout/style reference targets and replicate their designs automatically.
