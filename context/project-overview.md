## Social Media PM SaaS — Project Specifications

📱 Project & content management for social media teams and agencies

---

## 📌 Problem (Core Idea)

Social media agencies juggle content across scattered tools:

- Content plans in spreadsheets or generic PM tools that don't understand platforms
- Client approvals over email/WhatsApp threads with no audit trail
- Ad spend and sponsorship income tracked separately from the content that drove it
- No single view of "what's due, what's pending approval, what's making money"

➡️ **This app gives agencies ONE place to plan, approve, schedule, and track the financial
performance of content — per client, per social page.**

---

## 🧑‍💻 Users

| Persona            | Needs                                                     |
| ------------------ | --------------------------------------------------------- |
| Agency owner/admin | Cross-client overview, financial rollups, team management |
| Content editor     | Draft posts, manage tasks, upload assets                  |
| Client (external)  | Approve/reject content via a link, no login required      |

---

## ✨ Core Features

### A) Workspaces & Roles

- One workspace per agency; invite teammates
- Roles: Owner/Admin, Editor, Client (view + approve only)

### B) Clients & Projects

- Clients grouped under a workspace
- Projects/campaigns grouped under a client

### C) Social Pages

- Each client can have multiple pages (Instagram, TikTok, Facebook, X, LinkedIn)
- Posts publish to a specific page, not just a generic "platform" tag

### D) Content Workflow

- Content calendar (month/week view)
- Kanban board: Idea → Draft → Internal Review → Client Review → Approved → Scheduled → Published
- Post composer: caption, media, page, scheduled date/time
- Comment threads on each post
- Client-facing approve/reject links (no login)

### E) Task Management

- Kanban tasks separate from content posts (e.g. "get logo files from client")
- Assignee, due date, status

### F) Media Library

- Upload and reuse images/video across posts

### G) Financial Tracking (per social page)

- Transactions: income (sponsorship, affiliate, ad-share, retainer) and expense (ad spend,
  content production, freelancer pay, tools/subscriptions)
- Amounts stored as integer cents, with currency
- Optional link from a transaction to the specific post it relates to
- P&L summary per page, rolled up per client and workspace-wide
- Recurring transactions for monthly retainers/subscriptions

### H) Notifications

- In-app notifications for assignments, approvals, comments

---

## 🗄️ Data Model (Convex schema, current draft)

> Starting point — will evolve as features are built. Check convex/schema.ts for the
> canonical current version; this file may lag behind.

```typescript
workspaces: { name, plan }
members: { workspaceId, userId, role }
clients: { workspaceId, name, logoUrl }
projects: { clientId, name, status }
socialPages: { clientId, platform, handle, isActive }
posts: { projectId, pageId, caption, status, scheduledAt }
tasks: { projectId, title, assigneeId, dueDate }
comments: { postId, authorId, body }
assets: { postId, storageId, type }
transactions: { pageId, postId?, type, category, amount, currency, date, recurring }
```

---

## 🧱 Tech Stack

| Category   | Choice                                                         |
| ---------- | -------------------------------------------------------------- |
| Framework  | Next.js 15 (App Router)                                        |
| Language   | TypeScript (strict)                                            |
| Backend    | Convex (database, realtime, file storage, scheduled functions) |
| UI         | shadcn/ui + Tailwind                                           |
| Auth       | Clerk                                                          |
| AI agent   | Antigravity CLI (agy)                                          |
| Deployment | Vercel (likely)                                                |

---

## 🧭 Roadmap

### MVP

- Workspaces, clients, projects, social pages
- Content calendar + kanban board
- Post composer + approval workflow + comments
- Media library
- Financial tracking: transactions, per-page P&L
- Client-facing share links

### v2

- Direct publishing to platforms (Meta Graph API, TikTok API, X API)
- AI caption/hashtag generation
- Analytics dashboard (engagement pulled from platform APIs)
- Recurring transaction automation, budget vs actual
- Stripe billing for the SaaS itself

### Future

- White-labeling for agencies reselling to their own clients
- CSV/PDF export for client billing reports
- Mobile PWA polish

---

## 📌 Status

- In planning — schema and workflow design in progress
