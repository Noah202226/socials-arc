Created At: 2026-09-04T22:16:00Z
File Path: `file:///c:/Noa%20Files/myProjects/socials-arc/context/current-feature.md`

# Current Feature

Client-Level Financial Transactions & Hetzner/Cloud Server Billing Tracker with Real-Time Card Summaries

## Status

Ready for Review & Merge

## Goals

1. [x] Add client-level transaction query `api.transactions.listByClient` in `convex/transactions.ts` supporting direct client transactions and client page transactions sorted by date.
2. [x] Update `convex/clientAssets.ts` `getClientNetSummary` to calculate `cloudHostingExpense` (filtering for `cloud_vps_hosting`, `hosting_services`, or descriptions with "hetzner"/"server"/"vps") and `transactionCount`.
3. [x] Refine recurring proration in `convex/clientAssets.ts` so `one_time` transactions are strictly excluded from monthly MRR and daily burn paces.
4. [x] Create modern `components/clients/ClientTransactionModal.tsx` with presets for Hetzner Cloud VPS (CPX21), AWS Infrastructure, Domain & SSL Renewal, Tools & SaaS Licenses, and Client Retainers, plus transaction history and receipt attachments.
5. [x] Wire `ClientTransactionModal` into `app/(dashboard)/[workspaceSlug]/clients/page.tsx`, add `+ Transaction` button to client card action bar, and display Hetzner/Cloud Hosting expenses and daily net burn directly on the client card.
6. [x] Validate with `npx tsc --noEmit` and verify end-to-end in browser with real transaction logging and card summary updates.

## History

- Deep Client Inventories (Cloud/Hetzner VPS, Assets) & Recurring Prorated Finance (MRR & Daily Pace)
- Client Team Member Assignments & Card Display
- Clients & Pages UI/UX Polish: Integrated Client Command Hubs
- Workspace Currency Selection & Client Inventory Valuation Tracking implementation
- Lead Monitoring & CRM Pipeline implementation
- Finance Client Selection & Responsive 2-Column Modal implementation
- Kanban Task Multiple File & Image Attachments implementation
- SaaS Stripe Billing Setup implementation
- Financial Tracking (P&L Ledger) implementation
- Media Library (Asset Management) implementation
- Project setup and boilerplate cleanup
- Workspace creation + Clerk auth wiring & dashboard routing
- Clients, Campaigns, and Social Pages management implementation
- Tasks Kanban Board & Assistants Workload Tracker implementation
- Workspace Invitation Flow implementation
- Responsive design updates
- Content Workflow & Calendar implementation
- Kanban Customization & Settings Page implementation
