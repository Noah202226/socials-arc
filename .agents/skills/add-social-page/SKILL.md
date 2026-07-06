---
name: add-social-page
description: Use when adding features related to social pages themselves - creating, editing, listing pages per client, or connecting a new platform.
---

# Adding social page features

## Steps

1. A social page always belongs to exactly one client (`clientId`) — there's no
   cross-client page sharing in this data model, don't add one without asking first.
2. Platform is a fixed union (`instagram | facebook | tiktok | x | linkedin`) in
   `convex/schema.ts`. Adding a new platform means updating that union, plus any UI that
   switches on platform (icons, colors, composer field differences).
3. Posts reference a page via `pageId`, and transactions also reference a page via
   `pageId` — when building a page detail view, both the post feed and the finance summary
   for that page should be fetched, not just one or the other.
4. Deactivating a page (`isActive: false`) should not delete its posts or transactions —
   check this is a soft toggle, not a cascading delete, before implementing "remove page" UI.
