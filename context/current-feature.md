# Current Feature

Financial Tracking (P&L Ledger)

## Status

In Progress

## Goals

1. Create category specifications in `lib/finance-categories.ts` as the single source of truth for income and expense classifications.
2. Implement Convex mutations and queries for `transactions` in `convex/transactions.ts` (creating, updating, deleting, listing, and P&L summaries per page & per client).
3. Update the navigation layout in `app/(dashboard)/[workspaceSlug]/layout.tsx` to enable the "Finance P&L" menu item linking to `/${workspace.slug}/finance`.
4. Design and implement a premium Finance Ledger & P&L Dashboard at `app/(dashboard)/[workspaceSlug]/finance/page.tsx` showing revenue, expenses, net profits, and recurring ledger items.
5. Seed `convex/crons.ts` to schedule recurring transaction automation.

## Notes

- Currency amounts are stored as integer cents (e.g., $10.00 is stored as 1000). Never use floats.
- Perform calculations using integer math to prevent silent rounding bugs.
- Rollups must stay in sync across page summaries and client summaries.

## History

- Media Library (Asset Management) implementation
- Project setup and boilerplate cleanup
- Workspace creation + Clerk auth wiring & dashboard routing
- Clients, Campaigns, and Social Pages management implementation
- Tasks Kanban Board & Assistants Workload Tracker implementation
- Workspace Invitation Flow implementation
- Responsive design updates
- Content Workflow & Calendar implementation
- Kanban Customization & Settings Page implementation
