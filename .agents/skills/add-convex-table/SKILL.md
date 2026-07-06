---
name: add-convex-table
description: Use when adding a new table to the Convex schema or modifying an existing table's fields.
---

# Adding or modifying a Convex table

Reference: `.agents/rules/convex-conventions.md`

## Steps

1. Check `convex/schema.ts` for existing naming patterns (camelCase fields, `v.union` for
   status-like fields, `v.id("tableName")` for references) before adding a new table.
2. Add at least one `.index()` for how the table will actually be queried — think about the
   query first, then add the index to match it, not the other way around.
3. If the new table references an existing one (e.g. a new `pageId` field), check which
   existing queries join across that relationship — you may need a compound index like
   `by_page_and_date`.
4. Run `npx convex dev` (should already be running) and confirm the schema pushes without
   errors before writing any functions against it.
5. Write the corresponding `convex/[tableName].ts` file with at minimum a `list`/`get` query
   and a `create` mutation, following the same file structure as existing entity files.
6. Update `context/project-overview.md`'s data model section to reflect the change — it's
   allowed to lag slightly but shouldn't drift for more than one feature cycle.
