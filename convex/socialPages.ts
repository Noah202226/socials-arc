import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Verifies workspace membership associated with a client.
 */
async function verifyMembershipByClient(ctx: any, clientId: any) {
  const client = await ctx.db.get(clientId);
  if (!client) {
    throw new ConvexError("Client not found");
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated");
  }

  const membership = await ctx.db
    .query("members")
    .withIndex("by_workspace_and_user", (q: any) =>
      q.eq("workspaceId", client.workspaceId).eq("userId", identity.subject)
    )
    .first();

  if (!membership) {
    throw new ConvexError("Unauthorized: Access denied to this workspace");
  }

  return { identity, membership, client };
}

/**
 * Verifies workspace membership directly.
 */
async function verifyMembershipDirect(ctx: any, workspaceId: any) {
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

/**
 * Creates/connects a social page for a client.
 */
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    platform: v.union(
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("tiktok"),
      v.literal("x"),
      v.literal("linkedin"),
    ),
    handle: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByClient(ctx, args.clientId);

    const pageId = await ctx.db.insert("socialPages", {
      clientId: args.clientId,
      platform: args.platform,
      handle: args.handle,
      isActive: true,
    });

    return await ctx.db.get(pageId);
  },
});

/**
 * Lists all social pages under a client.
 */
export const listByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByClient(ctx, args.clientId);

    return await ctx.db
      .query("socialPages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

/**
 * Lists all social pages in a workspace (rolls up pages of all clients).
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipDirect(ctx, args.workspaceId);

    // Fetch all clients in the workspace
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const clientIds = clients.map((c) => c._id);
    const allPages = [];

    // Fetch pages for each client
    for (const clientId of clientIds) {
      const pages = await ctx.db
        .query("socialPages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
      allPages.push(...pages);
    }

    return allPages;
  },
});

/**
 * Toggles a social page's active status (soft toggle).
 */
export const toggleActive = mutation({
  args: {
    pageId: v.id("socialPages"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Social page not found");
    }

    await verifyMembershipByClient(ctx, page.clientId);

    await ctx.db.patch(args.pageId, {
      isActive: args.isActive,
    });

    return await ctx.db.get(args.pageId);
  },
});
