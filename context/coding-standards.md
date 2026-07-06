# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types — use proper typing or `unknown`
- Define types for all props, Convex document shapes, and function args/returns
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only
- Use hooks for state and side effects
- Keep components focused — one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when you need state, effects, or Convex React hooks
  (`useQuery`, `useMutation`)
- Client-facing routes under `app/share/` must never import anything that assumes an
  authenticated session
- Dynamic routes for project/page/post detail views

## Convex

- Every table needs at least one `.index()` matching how it's actually queried — flag
  any table without one instead of adding an unindexed `.filter()`
- Post/task/transaction status fields are string literal unions, not free-text strings —
  check `convex/schema.ts` for the canonical list before adding a new status value
- Mutations validate input shape with `v.*` validators; don't trust client-passed data
- Scheduled/recurring logic (publish checks, recurring transactions) lives in
  `convex/crons.ts`, not scattered across feature files

## Finance-specific rules

- Currency amounts are always integers in the smallest unit (cents) — never `parseFloat`
  into an `amount` field, never store floats
- New transaction categories go in `lib/finance-categories.ts` as the single source of
  truth — never hardcode a category string inline
- Any change to P&L rollup logic must update both the per-page and per-client summary
  queries together — they must stay in sync

## Styling

- Tailwind CSS for all styling, shadcn/ui components where applicable
- No inline styles
- Dark mode first, light mode as option

## File Organization

- Components: `components/[feature]/ComponentName.tsx`
- Pages: `app/(dashboard)/[workspaceSlug]/[route]/page.tsx`
- Convex functions: `convex/[entity].ts` (e.g. `convex/transactions.ts`)
- Lib/Utils: `lib/[utility].ts`

## Naming

- Components: PascalCase (`TransactionTable.tsx`)
- Files: match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Error Handling

- Wrap Convex mutations in try/catch on the client side; surface errors via toast
- Convex actions calling external APIs (social platforms) must handle and log failures
  without crashing the scheduled job

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
