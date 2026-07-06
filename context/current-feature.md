# Current Feature

Workspace creation + Clerk auth wiring

## Status

Completed

## Goals

1. Wire up Clerk auth (`ClerkProvider`) and Convex with Clerk (`ConvexProviderWithClerk`) on the frontend. (Completed)
2. Implement auto-creation of a workspace on user's first login. (Completed)
3. Seed the owner as the first member of the new workspace. (Completed)

## Notes

- Clerk keys configured in `.env.local` and synced to Convex cloud environment.
- Added dummy fallback domain to `convex/auth.config.ts` to allow compilation during initial CLI setups.

## History

- Project setup and boilerplate cleanup
- Workspace creation + Clerk auth wiring
