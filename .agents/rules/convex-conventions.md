# Convex Conventions

- Every table needs at least one `.index()` matching how it's actually queried. Don't add
  an unindexed `.filter()` as a substitute for an index — flag it instead.
- Status fields (posts, tasks, transactions) are string literal unions defined in
  `convex/schema.ts`. Check the canonical list there before introducing a new status value —
  don't invent one inline in a component or mutation.
- Mutations validate all args with `v.*` validators. Never trust client-passed data as-is.
- Queries that back a P&L or dashboard summary (`getPageSummary`, `getClientSummary`, etc.)
  must be kept in sync with each other — if you change one, check the others that roll up
  from it.
- Scheduled/recurring logic (publish checks, recurring transaction generation) lives in
  `convex/crons.ts`. Don't scatter `cron`-triggered logic across feature files.
- Prefer `.withIndex()` over `.filter()` whenever a query has more than a handful of rows —
  `.filter()` scans every document in the table.
- File uploads go through Convex file storage (`ctx.storage`), referenced by `storageId`,
  not stored as raw base64 in a document field.
