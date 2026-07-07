# Current Feature

Media Library (Asset Management)

## Status

In Progress

## Goals

1. Implement Convex mutations and queries for `assets` in `convex/assets.ts` (upload url generation, saving asset mappings to posts, listing assets).
2. Add "Media Library" or "Assets" sub-menu/card or view under active dashboard.
3. Wire up Convex HTTP Actions or file storage URLs to serve media files.
4. Integrate media uploads into the **Post Composer** and **Post Inspector** so users can attach images/videos to posts.

## Notes

- Uses Convex's built-in File Storage (`ctx.storage.getUrl(storageId)`).
- Supports displaying attachments as previews inside the Content Kanban Cards and Calendar slots.

## History

- Project setup and boilerplate cleanup
- Workspace creation + Clerk auth wiring & dashboard routing
- Clients, Campaigns, and Social Pages management implementation
- Tasks Kanban Board & Assistants Workload Tracker implementation
- Workspace Invitation Flow implementation
- Responsive design updates
- Content Workflow & Calendar implementation
- Kanban Customization & Settings Page implementation
