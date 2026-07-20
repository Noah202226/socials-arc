import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Verifies that the authenticated user is a member of the given workspace.
 */
async function verifyMembership(ctx: any, workspaceId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated");
  }

  const membership = await ctx.db
    .query("members")
    .withIndex("by_workspace_and_user", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("userId", identity.subject)
    )
    .first();

  if (!membership) {
    throw new ConvexError("Unauthorized: Access denied to this workspace");
  }

  return { identity, membership };
}

const platformValidator = v.union(
  v.literal("instagram"),
  v.literal("facebook"),
  v.literal("tiktok"),
  v.literal("x"),
  v.literal("linkedin"),
  v.literal("website"),
  v.literal("other")
);

/**
 * Lists all leads for a given workspace with optional status, client, and assignee filtering.
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    assigneeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    let leadsQuery;
    if (args.status) {
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_workspace_and_status", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("status", args.status!)
        );
    } else {
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId));
    }

    let leads = await leadsQuery.collect();

    if (args.clientId) {
      leads = leads.filter((l) => l.clientId === args.clientId);
    }

    if (args.assigneeId) {
      leads = leads.filter((l) => l.assigneeId === args.assigneeId);
    }

    // Sort by creation or update descending
    leads.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));

    // Populate client and page info if attached
    const enriched = await Promise.all(
      leads.map(async (lead) => {
        let clientName = null;
        let pageHandle = null;

        if (lead.clientId) {
          const client = await ctx.db.get(lead.clientId);
          if (client) clientName = client.name;
        }

        if (lead.pageId) {
          const page = await ctx.db.get(lead.pageId);
          if (page) pageHandle = `${page.platform}: @${page.handle}`;
        }

        return {
          ...lead,
          clientName,
          pageHandle,
        };
      })
    );

    return enriched;
  },
});

/**
 * Gets details of a single lead, including its activities timeline and linked records.
 */
export const getDetails = query({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new ConvexError("Lead not found");
    }

    await verifyMembership(ctx, lead.workspaceId);

    const activities = await ctx.db
      .query("leadActivities")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .collect();

    // Sort activities chronological ascending
    activities.sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0));

    let client = null;
    if (lead.clientId) {
      client = await ctx.db.get(lead.clientId);
    }

    let page = null;
    if (lead.pageId) {
      page = await ctx.db.get(lead.pageId);
    }

    return {
      lead,
      activities,
      client,
      page,
    };
  },
});

/**
 * Creates a new lead in the workspace.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    handle: v.optional(v.string()),
    platform: platformValidator,
    status: v.optional(v.string()), // defaults to "new"
    contactInfo: v.optional(v.string()),
    source: v.optional(v.string()),
    value: v.optional(v.number()), // integer cents
    currency: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    pageId: v.optional(v.id("socialPages")),
    notes: v.optional(v.string()),
    nextFollowUpAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { identity } = await verifyMembership(ctx, args.workspaceId);

    const status = args.status || "new";
    const now = Date.now();

    const leadId = await ctx.db.insert("leads", {
      workspaceId: args.workspaceId,
      name: args.name,
      handle: args.handle,
      platform: args.platform,
      status,
      contactInfo: args.contactInfo,
      source: args.source,
      value: args.value !== undefined ? Math.round(args.value) : undefined,
      currency: args.currency || "USD",
      assigneeId: args.assigneeId,
      clientId: args.clientId,
      pageId: args.pageId,
      notes: args.notes,
      lastContactAt: now,
      nextFollowUpAt: args.nextFollowUpAt,
      createdBy: identity.subject,
    });

    // Create initial creation activity entry
    const authorName = identity.name || identity.email || "Team Member";
    await ctx.db.insert("leadActivities", {
      leadId,
      authorId: identity.subject,
      authorName,
      type: "status_change",
      message: `Created lead "${args.name}" with status "${status}"`,
      newStatus: status,
    });

    return leadId;
  },
});

/**
 * Updates status of a lead and logs a status_change activity event.
 */
export const updateStatus = mutation({
  args: {
    leadId: v.id("leads"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new ConvexError("Lead not found");
    }

    const { identity } = await verifyMembership(ctx, lead.workspaceId);

    const previousStatus = lead.status;
    if (previousStatus === args.newStatus) {
      return lead._id;
    }

    const now = Date.now();
    await ctx.db.patch(args.leadId, {
      status: args.newStatus,
      lastContactAt: now,
    });

    const authorName = identity.name || identity.email || "Team Member";
    await ctx.db.insert("leadActivities", {
      leadId: args.leadId,
      authorId: identity.subject,
      authorName,
      type: "status_change",
      message: `Status updated from ${previousStatus.replace("_", " ")} to ${args.newStatus.replace("_", " ")}`,
      previousStatus,
      newStatus: args.newStatus,
    });

    return args.leadId;
  },
});

/**
 * Updates details of an existing lead.
 */
export const updateDetails = mutation({
  args: {
    leadId: v.id("leads"),
    name: v.string(),
    handle: v.optional(v.string()),
    platform: platformValidator,
    status: v.string(),
    contactInfo: v.optional(v.string()),
    source: v.optional(v.string()),
    value: v.optional(v.number()), // integer cents
    currency: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    pageId: v.optional(v.id("socialPages")),
    notes: v.optional(v.string()),
    nextFollowUpAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new ConvexError("Lead not found");
    }

    const { identity } = await verifyMembership(ctx, lead.workspaceId);

    const previousStatus = lead.status;
    const isStatusChanged = previousStatus !== args.status;

    await ctx.db.patch(args.leadId, {
      name: args.name,
      handle: args.handle,
      platform: args.platform,
      status: args.status,
      contactInfo: args.contactInfo,
      source: args.source,
      value: args.value !== undefined ? Math.round(args.value) : undefined,
      currency: args.currency || "USD",
      assigneeId: args.assigneeId,
      clientId: args.clientId,
      pageId: args.pageId,
      notes: args.notes,
      nextFollowUpAt: args.nextFollowUpAt,
    });

    if (isStatusChanged) {
      const authorName = identity.name || identity.email || "Team Member";
      await ctx.db.insert("leadActivities", {
        leadId: args.leadId,
        authorId: identity.subject,
        authorName,
        type: "status_change",
        message: `Status changed from ${previousStatus.replace("_", " ")} to ${args.status.replace("_", " ")}`,
        previousStatus,
        newStatus: args.status,
      });
    }

    return args.leadId;
  },
});

/**
 * Deletes a lead and its activity history.
 */
export const deleteLead = mutation({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new ConvexError("Lead not found");
    }

    await verifyMembership(ctx, lead.workspaceId);

    // Remove activities
    const activities = await ctx.db
      .query("leadActivities")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    await ctx.db.delete(args.leadId);

    return true;
  },
});

/**
 * Adds a note or response activity item to a lead.
 */
export const addActivity = mutation({
  args: {
    leadId: v.id("leads"),
    type: v.union(v.literal("note"), v.literal("response")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new ConvexError("Lead not found");
    }

    const { identity } = await verifyMembership(ctx, lead.workspaceId);

    const now = Date.now();

    // Update lastContactAt when adding a response or note
    await ctx.db.patch(args.leadId, {
      lastContactAt: now,
    });

    const authorName = identity.name || identity.email || "Team Member";
    const activityId = await ctx.db.insert("leadActivities", {
      leadId: args.leadId,
      authorId: identity.subject,
      authorName,
      type: args.type,
      message: args.message,
    });

    return activityId;
  },
});

/**
 * Computes high-level lead performance metrics for a workspace.
 */
export const getMetrics = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const totalLeads = leads.length;

    let activePipelineValue = 0; // In integer cents
    let wonValue = 0; // In integer cents
    let wonCount = 0;
    let lostCount = 0;

    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      discussion: 0,
      proposal_sent: 0,
      won: 0,
      lost: 0,
    };

    const platformCounts: Record<string, number> = {
      instagram: 0,
      facebook: 0,
      tiktok: 0,
      x: 0,
      linkedin: 0,
      website: 0,
      other: 0,
    };

    for (const lead of leads) {
      const status = lead.status || "new";
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const platform = lead.platform || "other";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;

      const val = lead.value || 0;

      if (["new", "contacted", "discussion", "proposal_sent"].includes(status)) {
        activePipelineValue += val;
      } else if (status === "won") {
        wonValue += val;
        wonCount++;
      } else if (status === "lost") {
        lostCount++;
      }
    }

    const closedCount = wonCount + lostCount;
    const conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    return {
      totalLeads,
      activePipelineValue,
      wonValue,
      wonCount,
      lostCount,
      conversionRate,
      statusCounts,
      platformCounts,
    };
  },
});
