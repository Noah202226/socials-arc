# Next.js Conventions

- Server components by default. Only add `'use client'` when the component needs state,
  effects, or a Convex React hook (`useQuery`, `useMutation`, `usePaginatedQuery`).
- Routes under `app/share/[approvalToken]/` are unauthenticated by design — never import
  anything there that assumes a Clerk session exists.
- Dynamic routes follow the resource hierarchy: `app/(dashboard)/[workspaceSlug]/projects/
[projectId]/`, `app/(dashboard)/[workspaceSlug]/pages/[pageId]/finance/`, etc. Don't flatten
  this into query params — the nesting mirrors the data model on purpose.
- Data fetching in server components goes straight through Convex's server-side client
  (`fetchQuery` / `preloadQuery`), not through a client-side `useQuery` wrapped in a
  server component.
- Forms use Server Actions where the mutation is simple; use a Convex mutation called from
  a client component when the UI needs optimistic updates (e.g. dragging a kanban card).
- Don't introduce a new UI library or icon set without checking if shadcn/ui or `lucide-react`
  already covers it.
