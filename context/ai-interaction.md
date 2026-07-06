# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in context/project-overview.md or the current feature spec
- Never delete files without clarification

## Workflow

This is the workflow for every feature/fix:

1. **Document** — Document the feature in @context/current-feature.md
2. **Branch** — Create a new branch for the feature/fix
3. **Implement** — Implement what's described in @context/current-feature.md
4. **Test** — Verify it works in the browser. Run `npm run build` and fix any errors.
   Add unit tests for Convex functions where it matters (finance calculations, status
   transitions)
5. **Iterate** — Iterate and change things if needed
6. **Commit** — Only after build passes and everything works
7. **Merge** — Merge to main
8. **Delete Branch** — Delete branch after merge
9. **Review** — Review AI-generated code periodically and on demand
10. **Close out** — Mark as completed in @context/current-feature.md and add to its history

Do NOT commit without permission and until the build passes. If the build fails, fix the
issues first.

## Branching

- New branch per feature/fix: `feature/[name]` or `fix/[name]`
- Ask before deleting the branch once merged

## Commits

- Ask before committing (don't auto-commit)
- Conventional commit messages (`feat:`, `fix:`, `chore:`)
- Keep commits focused — one feature/fix per commit
- Never include "Generated with [AI tool]" in commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features without asking
- Preserve existing patterns in the codebase — check context/coding-standards.md and
  similar existing files before introducing a new pattern

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation, client-share-link access boundaries)
- Performance (unnecessary re-renders, missing Convex indexes)
- Logic errors (edge cases — especially around currency math and status transitions)
- Patterns (matches existing codebase?)
