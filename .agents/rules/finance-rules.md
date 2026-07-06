# Finance Rules

- Amounts are always integers in the smallest currency unit (cents). Never store or compute
  with floats — `19.99` becomes `1999`, not `19.99`.
- Categories come from `lib/finance-categories.ts`, the single source of truth. Never
  hardcode a new category string inline in a component, mutation, or seed script — add it
  there first.
- Every transaction belongs to exactly one `socialPages` document via `pageId`. A
  transaction may optionally link to the `posts` document it funded via `postId` — don't
  make this required, most transactions won't have a specific post (e.g. monthly tool
  subscriptions).
- Recurring transactions store `recurring: true` and a `recurrenceInterval`. The actual
  generation of future entries happens in `convex/crons.ts`, not by writing multiple
  duplicate rows up front.
- P&L summary queries (`getPageSummary`, `getClientSummary`) must round only for display —
  never round intermediate values before summing.
- Currency field is a plain string (`"USD"`, `"PHP"`). Don't assume a single currency across
  the whole app — clients may pay in different currencies, and rollups across currencies
  should show them separately, not silently summed together.
