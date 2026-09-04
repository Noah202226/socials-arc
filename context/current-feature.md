Created At: 2026-09-03T22:55:00Z
File Path: `file:///c:/Noa%20Files/myProjects/socials-arc/context/current-feature.md`

# Current Feature

Deep Client Inventories (Cloud/Hetzner VPS, Assets) & Recurring Prorated Finance (MRR & Daily Pace)

## Status

Ready for Commit & Merge

## Goals

1. [x] Update `convex/schema.ts` to enrich `clientAssets` with cloud/server fields (`provider`, `specsOrDetails`, `renewalDate`, `recurringCost`, `costInterval`, `autoTrackExpense`, `status`).
2. [x] Update `convex/schema.ts` to allow `transactions` to be tied directly to a `clientId` or `workspaceId` (making `pageId` optional) with indexes and `billingFrequency`.
3. [x] Update `convex/clientAssets.ts` with enhanced asset CRUD and recurring cost calculations.
4. [x] Update `convex/transactions.ts` with direct client attribution and normalized recurring proration (MRR, ARR, Daily Recognized Income, Daily Expense Burn, Net Daily Pace).
5. [x] Update `components/clients/ClientAssetModal.tsx` to configure server/cloud specs (Hetzner VPS, provider, IP, renewal date, subscription costs).
6. [x] Update `app/(dashboard)/[workspaceSlug]/clients/page.tsx` cards with MRR, Daily Pace, and Cloud Hosting expense badges.
7. [x] Update `app/(dashboard)/[workspaceSlug]/finance/page.tsx` with Agency Normalized Recurring Run-Rate and Cloud/Hosting Burn cards.
8. [x] Prevent blank/empty fields in client inventory modal and backend mutations (comprehensive field validation, whitespace sanitization/trimming, and inline error states).

## History

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
