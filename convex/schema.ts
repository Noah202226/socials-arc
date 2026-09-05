import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ---------------------------------------------------------------------
  // Workspaces & Members
  // ---------------------------------------------------------------------
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("agency")),
    ownerId: v.string(), // Clerk user id
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    settings: v.optional(
      v.object({
        currency: v.optional(v.string()), // e.g. "PHP", "USD"
        currencySymbol: v.optional(v.string()), // e.g. "₱", "$"
        taskColumns: v.optional(
          v.array(
            v.object({
              id: v.string(),
              label: v.string(),
              color: v.string(),
              hidden: v.boolean(),
            })
          )
        ),
        postColumns: v.optional(
          v.array(
            v.object({
              id: v.string(),
              label: v.string(),
              color: v.string(),
              hidden: v.boolean(),
            })
          )
        ),
      })
    ),
  })
    .index("by_slug", ["slug"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  members: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user id
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("editor"),
      v.literal("client"),
    ),
    invitedEmail: v.optional(v.string()),
    joinedAt: v.optional(v.number()),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
    themeOverride: v.optional(v.union(v.literal("pink"), v.literal("default"))),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // ---------------------------------------------------------------------
  // Clients & Projects
  // ---------------------------------------------------------------------
  clients: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    isActive: v.boolean(),
    assignedMemberIds: v.optional(v.array(v.string())), // Clerk userIds of team members assigned to this client
  }).index("by_workspace", ["workspaceId"]),

  projects: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived"),
    ),
    description: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_client_and_status", ["clientId", "status"]),

  // ---------------------------------------------------------------------
  // Social Pages
  // ---------------------------------------------------------------------
  socialPages: defineTable({
    clientId: v.id("clients"),
    platform: v.union(
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("tiktok"),
      v.literal("x"),
      v.literal("linkedin"),
    ),
    handle: v.string(),
    isActive: v.boolean(),
  })
    .index("by_client", ["clientId"])
    .index("by_client_and_platform", ["clientId", "platform"]),

  // ---------------------------------------------------------------------
  // Posts (content lifecycle)
  // ---------------------------------------------------------------------
  posts: defineTable({
    projectId: v.id("projects"),
    pageId: v.id("socialPages"),
    caption: v.string(),
    status: v.string(),
    scheduledAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    assigneeId: v.optional(v.string()), // Clerk user id
    createdBy: v.string(), // Clerk user id
    approvalToken: v.optional(v.string()), // for client-facing share links
  })
    .index("by_project", ["projectId"])
    .index("by_page", ["pageId"])
    .index("by_project_and_status", ["projectId", "status"])
    .index("by_page_and_scheduled", ["pageId", "scheduledAt"])
    .index("by_approval_token", ["approvalToken"]),

  // ---------------------------------------------------------------------
  // Tasks (non-content work items)
  // ---------------------------------------------------------------------
  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    assigneeId: v.optional(v.string()), // Clerk user id
    dueDate: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"])
    .index("by_assignee", ["assigneeId"]),

  // ---------------------------------------------------------------------
  // Comments (on posts and tasks)
  // ---------------------------------------------------------------------
  comments: defineTable({
    postId: v.optional(v.id("posts")),
    taskId: v.optional(v.id("tasks")),
    authorId: v.string(), // Clerk user id, or "client" for external approver
    authorName: v.string(), // denormalized for display, esp. client-facing links
    body: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    replyToId: v.optional(v.id("comments")),
    replyToAuthorName: v.optional(v.string()),
    replyToBody: v.optional(v.string()),
  })
    .index("by_post", ["postId"])
    .index("by_task", ["taskId"]),

  // ---------------------------------------------------------------------
  // Assets (media library)
  // ---------------------------------------------------------------------
  assets: defineTable({
    postId: v.optional(v.id("posts")), // optional: assets can exist unattached in the library
    taskId: v.optional(v.id("tasks")), // attached to a task
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    type: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("document"),
    ),
    fileName: v.string(),
    uploadedBy: v.string(), // Clerk user id
  })
    .index("by_post", ["postId"])
    .index("by_task", ["taskId"])
    .index("by_project", ["projectId"]),

  // ---------------------------------------------------------------------
  // Transactions (financial tracking, per social page)
  // ---------------------------------------------------------------------
  transactions: defineTable({
    pageId: v.optional(v.id("socialPages")), // optional: allows direct client retainers or workspace infrastructure expenses
    clientId: v.optional(v.id("clients")),
    workspaceId: v.optional(v.id("workspaces")),
    postId: v.optional(v.id("posts")), // optionally link an expense to the post it funded
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(), // validated against lib/finance-categories.ts at the app layer
    amount: v.number(), // integer, smallest currency unit (cents)
    currency: v.string(), // e.g. "USD", "PHP"
    date: v.number(), // timestamp
    description: v.optional(v.string()),
    recurring: v.boolean(),
    recurrenceInterval: v.optional(
      v.union(v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    ),
    billingFrequency: v.optional(
      v.union(v.literal("one_time"), v.literal("monthly"), v.literal("yearly")),
    ),
    receiptStorageId: v.optional(v.id("_storage")),
    receiptStorageIds: v.optional(v.array(v.id("_storage"))),
    createdBy: v.string(), // Clerk user id
  })
    .index("by_page", ["pageId"])
    .index("by_page_and_date", ["pageId", "date"])
    .index("by_page_and_type", ["pageId", "type"])
    .index("by_recurring", ["recurring"])
    .index("by_client", ["clientId"])
    .index("by_workspace", ["workspaceId"]),

  // ---------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------
  notifications: defineTable({
    userId: v.string(), // Clerk user id
    workspaceId: v.id("workspaces"),
    type: v.union(
      v.literal("assigned"),
      v.literal("approval_requested"),
      v.literal("comment"),
      v.literal("status_changed"),
    ),
    message: v.string(),
    relatedPostId: v.optional(v.id("posts")),
    relatedTaskId: v.optional(v.id("tasks")),
    read: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  // ---------------------------------------------------------------------
  // Leads & Lead Activities (SSM Lead Monitoring)
  // ---------------------------------------------------------------------
  leads: defineTable({
    workspaceId: v.id("workspaces"),
    clientId: v.optional(v.id("clients")),
    pageId: v.optional(v.id("socialPages")),
    name: v.string(), // Lead or Business Name
    handle: v.optional(v.string()), // e.g. @brand_handle
    platform: v.union(
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("tiktok"),
      v.literal("x"),
      v.literal("linkedin"),
      v.literal("website"),
      v.literal("other"),
    ),
    contactInfo: v.optional(v.string()), // Email, phone, or WhatsApp link
    source: v.optional(v.string()), // e.g. Inbound DM, Comment, Outbound, Ad
    status: v.string(), // "new" | "contacted" | "discussion" | "proposal_sent" | "won" | "lost"
    value: v.optional(v.number()), // Deal size in integer cents (e.g., $500/mo = 50000)
    currency: v.optional(v.string()), // e.g. "USD"
    assigneeId: v.optional(v.string()), // Clerk user id of SSM team member
    notes: v.optional(v.string()), // General notes/requirements
    lastContactAt: v.optional(v.number()), // timestamp
    nextFollowUpAt: v.optional(v.number()), // timestamp
    createdBy: v.string(), // Clerk user id
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_status", ["workspaceId", "status"])
    .index("by_assignee", ["assigneeId"])
    .index("by_client", ["clientId"]),

  leadActivities: defineTable({
    leadId: v.id("leads"),
    authorId: v.string(),
    authorName: v.string(),
    type: v.union(
      v.literal("note"),
      v.literal("status_change"),
      v.literal("response"),
    ),
    message: v.string(),
    previousStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
  }).index("by_lead", ["leadId"]),

  // ---------------------------------------------------------------------
  // Client Inventory & Physical/Digital Assets
  // ---------------------------------------------------------------------
  clientAssets: defineTable({
    workspaceId: v.id("workspaces"),
    clientId: v.id("clients"),
    name: v.string(),
    category: v.union(
      v.literal("hardware"),
      v.literal("digital_asset"),
      v.literal("inventory_stock"),
      v.literal("license_domain"),
      v.literal("other"),
    ),
    quantity: v.number(),
    unitValue: v.number(), // integer cents
    totalValue: v.number(), // integer cents (quantity * unitValue)
    currency: v.optional(v.string()), // e.g. "PHP"
    acquisitionDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    // Hardware & Device Inventory fields:
    serialNumber: v.optional(v.string()), // e.g. serial #, asset tag
    assignedTo: v.optional(v.string()), // e.g. assigned member or desk location
    condition: v.optional(
      v.union(
        v.literal("brand_new"),
        v.literal("excellent"),
        v.literal("good"),
        v.literal("fair"),
        v.literal("needs_repair")
      )
    ),
    // Deep Cloud & Server Subscription details:
    provider: v.optional(v.string()), // e.g. "Hetzner", "AWS", "DigitalOcean", "Cloudflare", "Namecheap"
    specsOrDetails: v.optional(v.string()), // e.g. "CPX21 3 vCPU / 4GB RAM / 80GB NVMe - IP 168.119.x.x"
    renewalDate: v.optional(v.number()), // next expiration or renewal timestamp
    recurringCost: v.optional(v.number()), // integer cents for monthly/annual ongoing fee
    costInterval: v.optional(
      v.union(v.literal("monthly"), v.literal("yearly"), v.literal("one_time")),
    ),
    autoTrackExpense: v.optional(v.boolean()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("maintenance"), v.literal("expired"), v.literal("archived")),
    ),

    // Payment & Financing Method (Cash vs BNPL Apps like Shopee SPayLater / Lazada LazPayLater)
    paymentMethod: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("bnpl"),
        v.literal("credit_card"),
        v.literal("other")
      )
    ),
    bnplProvider: v.optional(v.string()), // e.g. "Shopee SPayLater", "Lazada LazPayLater", "Billease", "Maya PayLater"
    bnplOrderNumber: v.optional(v.string()), // Order / Tracking ID from Shopee or Lazada
    bnplTotalFinanced: v.optional(v.number()), // Total financed amount in integer cents
    bnplDownpayment: v.optional(v.number()), // Downpayment paid at purchase in integer cents
    bnplMonthlyInstallment: v.optional(v.number()), // Monthly due amount in integer cents
    bnplTotalInstallments: v.optional(v.number()), // Total months (e.g. 3, 6, 12)
    bnplInstallmentsPaid: v.optional(v.number()), // Number of installments paid to date
    bnplDueDay: v.optional(v.number()), // Day of month payment is due (1-31)
    bnplNextDueDate: v.optional(v.number()), // Timestamp of next installment due
    bnplStatus: v.optional(
      v.union(v.literal("active"), v.literal("fully_paid"))
    ),

    // PC Component & Custom Build Allocation
    partType: v.optional(
      v.union(
        v.literal("gpu"),
        v.literal("cpu"),
        v.literal("motherboard"),
        v.literal("ram"),
        v.literal("storage"),
        v.literal("psu"),
        v.literal("case"),
        v.literal("cooling"),
        v.literal("peripheral"),
        v.literal("complete_pc"),
        v.literal("other")
      )
    ),
    buildStatus: v.optional(
      v.union(
        v.literal("in_stock"),
        v.literal("reserved"),
        v.literal("installed_in_pc"),
        v.literal("sold")
      )
    ),
    targetProjectId: v.optional(v.id("projects")), // Link to client's custom PC build campaign/project
    createdBy: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_client", ["clientId"])
    .index("by_client_and_category", ["clientId", "category"])
    .index("by_workspace_and_payment_method", ["workspaceId", "paymentMethod"])
    .index("by_workspace_and_build_status", ["workspaceId", "buildStatus"])
    .index("by_project", ["targetProjectId"]),

  // ---------------------------------------------------------------------
  // Client Customer Subscribers (e.g. Cliniqly's Dental Clinic Customers)
  // ---------------------------------------------------------------------
  clientSubscribers: defineTable({
    clientId: v.id("clients"), // e.g. Cliniqly
    workspaceId: v.id("workspaces"),
    customerName: v.string(), // e.g. "Dr. Santos Dental Clinic", "Apex Orthodontics"
    contactPerson: v.optional(v.string()), // e.g. "Dr. Maria Santos"
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    planName: v.string(), // e.g. "Cliniqly Cloud Pro (Annual)", "Basic Clinic License"
    billingCycle: v.union(v.literal("annual"), v.literal("monthly"), v.literal("quarterly")),
    amount: v.number(), // integer cents (e.g. 3500000 for ₱35,000)
    currency: v.string(), // "PHP", "USD"
    paymentStatus: v.union(
      v.literal("paid"),
      v.literal("due_soon"),
      v.literal("overdue"),
      v.literal("unpaid")
    ),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("canceled")),
    startDate: v.number(), // timestamp
    lastPaymentDate: v.optional(v.number()), // timestamp when last payment was made
    lastPaymentAmount: v.optional(v.number()), // integer cents
    nextPaymentDueDate: v.number(), // timestamp when next subscription payment is due
    paymentMethod: v.optional(v.string()), // "Bank Transfer", "GCash", "Check", "Credit Card"
    notes: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    createdBy: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_client", ["clientId"])
    .index("by_client_and_status", ["clientId", "status"])
    .index("by_client_and_due_date", ["clientId", "nextPaymentDueDate"])
    .index("by_workspace_and_due_date", ["workspaceId", "nextPaymentDueDate"]),
});
