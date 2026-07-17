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
  // Comments (on posts)
  // ---------------------------------------------------------------------
  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.string(), // Clerk user id, or "client" for external approver
    authorName: v.string(), // denormalized for display, esp. client-facing links
    body: v.string(),
  }).index("by_post", ["postId"]),

  // ---------------------------------------------------------------------
  // Assets (media library)
  // ---------------------------------------------------------------------
  assets: defineTable({
    postId: v.optional(v.id("posts")), // optional: assets can exist unattached in the library
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
    .index("by_project", ["projectId"]),

  // ---------------------------------------------------------------------
  // Transactions (financial tracking, per social page)
  // ---------------------------------------------------------------------
  transactions: defineTable({
    pageId: v.id("socialPages"),
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
    receiptStorageId: v.optional(v.id("_storage")),
    createdBy: v.string(), // Clerk user id
  })
    .index("by_page", ["pageId"])
    .index("by_page_and_date", ["pageId", "date"])
    .index("by_page_and_type", ["pageId", "type"])
    .index("by_recurring", ["recurring"]),

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
});
