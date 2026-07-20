Created At: 2026-07-20T20:08:00Z
Completed At: 2026-07-20T20:10:45Z
File Path: `file:///c:/Noa%20Files/myProjects/socials-arc/context/current-feature.md`

# Current Feature

Lead Monitoring & CRM Pipeline (Leads Tracking & Metrics)

## Status

Completed

## Goals

1. [x] Create `convex/leads.ts` with complete backend queries and mutations:
   - `listByWorkspace`: fetch workspace leads with optional filters (status, client, assignee).
   - `getDetails`: fetch single lead with populated activity timeline.
   - `create`: insert lead record into `leads` table with workspace authorization.
   - `updateStatus`: transition lead status with auto-logged `leadActivities` record.
   - `updateDetails`: edit lead details, value (integer cents), assignee, contact info, follow-up date.
   - `deleteLead`: remove lead and activity history.
   - `addActivity`: log manual notes and response activities.
   - `getMetrics`: aggregate total leads, active pipeline value, won deals value, conversion rate %, and platform/status breakdowns.
2. [x] Add `Leads Tracker` navigation item in `app/(dashboard)/[workspaceSlug]/layout.tsx` under Features.
3. [x] Build Lead Management Dashboard page in `app/(dashboard)/[workspaceSlug]/leads/page.tsx`:
   - Summary Metric Cards (Total Leads, Active Pipeline Value, Won Value, Win Conversion Rate).
   - Status Tabs / Filter bar (All, New, Contacted, Discussion, Proposal Sent, Won, Lost).
   - Interactive Leads Table & Kanban Board view toggle.
4. [x] Build Lead Form Modal (`components/leads/LeadFormModal.tsx`) to create & edit leads (integer cents currency conversion, assignee selection, client/page linking, next follow-up date).
5. [x] Build Lead Details & Activity Drawer (`components/leads/LeadDetailsDrawer.tsx`) to view full lead history, log activities/notes, and quickly trigger status transitions.

## Notes

- Currency values (`value`) are strictly stored as integer cents in the database (e.g. $500.00 = 50000 cents).
- Status changes automatically append a `leadActivities` record of type `status_change`.
- Uses Convex indexes `by_workspace`, `by_workspace_and_status`, `by_lead` for optimal performance.

## History

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
