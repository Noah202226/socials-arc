# Current Feature

SaaS Stripe Billing Setup

## Status

Completed

## Goals

1. [x] Install `stripe` and `@stripe/stripe-js` npm packages.
2. [x] Implement Stripe Checkout and Customer Portal integration in Convex actions (generating session links).
3. [x] Set up a Convex HTTP Webhook handler to receive Stripe subscription events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) and update the workspace plan tier in the database.
4. [x] Design a premium **Billing & Plans** tab/section in the Settings page (`app/(dashboard)/[workspaceSlug]/settings/page.tsx`) that displays tier statuses and triggers subscription checkouts.
5. [x] Enforce Free, Pro, and Agency plan limits (clients, connected social channels, monthly scheduled posts budget) across all Convex creation mutations.

## Notes

- Workspace tiers are: `free`, `pro`, and `agency`.
- Webhooks must verify Stripe signature using webhook secret to ensure security.
- HTTP action routing in Convex lives in `convex/http.ts`.

## History

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
