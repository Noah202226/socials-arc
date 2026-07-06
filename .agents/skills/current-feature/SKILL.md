---
name: current-feature
description: Use at the start of almost every task to check what's actively being worked on before scanning the codebase.
---

# Current feature — cache-first entry point

Before reading `convex/schema.ts` in full or scanning the broader codebase, read
`context/current-feature.md`. It names:

- The feature currently in progress
- Its goals/requirements
- Which files it touches

## Steps

1. Read `context/current-feature.md`.
2. If the task matches what's described there, work within the files it names — don't
   widen the search unless something is missing.
3. If the task doesn't match (a new feature, a fix, or something unrelated), say so and
   ask whether to update `context/current-feature.md` before starting, rather than silently
   working on something undocumented.
4. When the feature is done: update the file's `Status` to `Completed`, add a line to its
   `History` section, and confirm before moving on to the next thing.
