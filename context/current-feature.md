# Current Feature

Clients, Campaigns, and Social Pages Management

## Status

Completed

## Goals

1. Implement Convex mutations and queries for `clients` (create, list by workspace, toggle isActive status). (Completed)
2. Implement Convex mutations and queries for `projects` (create, list by client/status, update status). (Completed)
3. Implement Convex mutations and queries for `socialPages` (create/connect, list by client, toggle isActive status). (Completed)
4. Build frontend views and forms/modals to create clients, campaigns/projects, and link social pages within the workspace dashboard. (Completed)

## Notes

- Upgraded `lucide-react` to `^0.470.0` to resolve missing brand/social platform icons (Facebook, Instagram, LinkedIn).
- Introduced dashboard shared layout (`layout.tsx`) under `/[workspaceSlug]` to prevent code duplication between views.
- Wired all creation modal forms with proper state and async mutation tracking.

## History

- Project setup and boilerplate cleanup
- Workspace creation + Clerk auth wiring & dashboard routing
- Clients, Campaigns, and Social Pages management implementation
