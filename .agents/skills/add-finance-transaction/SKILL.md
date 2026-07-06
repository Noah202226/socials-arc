---
name: add-finance-transaction
description: Use when adding or modifying transaction (income/expense) logic, currency handling, or P&L rollups for social pages.
---

# Adding finance transaction features

Reference: `.agents/rules/finance-rules.md`

## Steps

1. Check `convex/transactions.ts` for existing query/mutation patterns before adding new ones.
2. Amounts are always integers in cents — never `parseFloat` into an `amount` field, and
   never format for display before the value is done being computed with.
3. Any new category must be added to `lib/finance-categories.ts` first, then referenced —
   don't introduce a category string anywhere else.
4. If the change affects P&L rollup, update both `getPageSummary` and `getClientSummary`
   together — check that they stay consistent (e.g. both round only at display time).
5. If the transaction should support recurrence, set `recurring: true` and
   `recurrenceInterval`, and confirm `convex/crons.ts` already handles generating future
   entries for that interval — don't write a one-off generator inside the feature file.
6. Write or update a small test/manual-check for the currency math specifically (e.g. sum
   of three transactions in different categories nets correctly) before considering the
   task done — this is the area most prone to silent rounding bugs.
