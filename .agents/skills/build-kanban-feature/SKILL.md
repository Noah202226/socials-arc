---
name: build-kanban-feature
description: Use when building or modifying the kanban board for posts or tasks, including drag-and-drop status changes.
---

# Building kanban board features

## Steps

1. Posts and tasks are separate entities with separate status unions — a kanban board for
   posts uses `posts.status` (draft → internal_review → client_review → changes_requested
   → approved → scheduled → published), and a board for tasks uses `tasks.status`
   (todo → in_progress → done). Don't merge them into one shared status enum.
2. Drag-and-drop status changes call a Convex mutation directly from the client component
   (`'use client'`), using `useMutation`, so the UI can show an optimistic update while the
   write completes.
3. Moving a post into `client_review` should generate an `approvalToken` if one doesn't
   already exist — check the mutation handles this rather than assuming the token exists.
4. Moving a post to `changes_requested` should not silently clear existing comments — the
   whole point of the loop-back is that the conversation thread stays visible when the
   editor picks the post back up.
5. Column definitions (which statuses map to which column, in what order) belong in a
   single constant, not duplicated across the board component and any status-badge component.
