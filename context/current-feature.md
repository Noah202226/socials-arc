# Current Feature

Content Workflow & Calendar

## Status

In Progress

## Goals

1. Implement Convex mutations and queries for `posts` and `comments` (`convex/posts.ts` and `convex/comments.ts`). (Completed)
2. Enable "Content Workflow" navigation link in `app/(dashboard)/[workspaceSlug]/layout.tsx` pointing to `/content`.
3. Build the Content Workspace page at `app/(dashboard)/[workspaceSlug]/content/page.tsx` with:
   - **Kanban Board**: Drag/move posts through statuses: Draft ➔ Internal Review ➔ Client Review ➔ Changes Requested ➔ Approved ➔ Scheduled ➔ Published.
   - **Content Calendar**: Interactive calendar view showing posts by their scheduled dates.
   - **Post Composer**: Modal form to add a post, select project, select social page, input caption, and set date/time.
   - **Post Inspector**: Modal to view post details, change status, display the copyable Client Approval link, and read/post comments.

## Notes

- Make sure moving a post into `client_review` automatically generates an `approvalToken` if it doesn't exist.
- Moving a post back to `changes_requested` should keep the comments thread active.

## History

- Project setup and boilerplate cleanup
- Workspace creation + Clerk auth wiring & dashboard routing
- Clients, Campaigns, and Social Pages management implementation
- Tasks Kanban Board & Assistants Workload Tracker implementation
- Workspace Invitation Flow implementation
- Responsive design updates
