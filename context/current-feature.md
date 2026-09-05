Created At: 2026-09-04T22:16:00Z
File Path: `file:///c:/Noa%20Files/myProjects/socials-arc/context/current-feature.md`

# Current Feature

Client Customer Subscribers & Annual Renewal Payment Tracker (e.g. Cliniqly's Dental Clinic Customers)

## Status

Merged & Completed

## Goals

1. [x] Add `clientSubscribers` table to `convex/schema.ts` with indexes `by_client`, `by_client_and_status`, `by_client_and_due_date`, and `by_workspace_and_due_date`.
2. [x] Create `convex/clientSubscribers.ts` with queries (`listByClient`) and mutations (`create`, `update`, `recordPayment`, `remove`) including automatic +1 year / +1 month renewal date advancement, ledger income transaction creation, and editing support.
3. [x] Extend `convex/clientAssets.ts` `getClientNetSummary` to calculate subscriber rollups (`subscriberCount`, `subscribersARR`, `subscribersMRR`, `renewalsDueSoonCount`, `renewalsOverdueCount`).
4. [x] Build `components/clients/ClientSubscribersModal.tsx` with top KPI ribbon (Total Subscribers, ARR, MRR, Paid Up, Due Soon), filterable subscriber directory with countdown badges, quick "Record Annual Payment" action, and add new subscriber form.
5. [x] Add inline "Edit" modal for modifying subscriber information (clinic name, doctor/contact, phone, email, plan, pricing, renewal due date, and notes).
6. [x] Wire `ClientSubscribersModal` into `app/(dashboard)/[workspaceSlug]/clients/page.tsx`, adding the `Subscribers` button with ARR badges to client cards.
7. [x] Validate with `npx tsc --noEmit` and verify end-to-end in the browser with Cliniqly's dental clinic customers.

## History

- Client Customer Subscribers & Annual Renewal Payment Tracker (e.g. Cliniqly's Dental Clinic Customers)
- Client-Level Financial Transactions & Hetzner/Cloud Server Billing Tracker with Real-Time Card Summaries

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
