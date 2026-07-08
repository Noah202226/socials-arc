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

  const workspace = await ctx.db.get(client.workspaceId);
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  return { identity, membership, client, workspace };
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
    const { client, workspace } = await verifyMembershipByClient(ctx, args.clientId);

    // Rollup existing pages across all clients of this workspace
    const workspaceClients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    let totalPagesCount = 0;
    for (const c of workspaceClients) {
      const pages = await ctx.db
        .query("socialPages")
        .withIndex("by_client", (q) => q.eq("clientId", c._id))
        .collect();
      totalPagesCount += pages.length;
    }

    if (workspace.plan === "free" && totalPagesCount >= 1) {
      throw new ConvexError("Your workspace is on the Free tier, which is limited to 1 connected social page. Please upgrade to Pro or Agency in Settings.");
    }

    if (workspace.plan === "pro" && totalPagesCount >= 5) {
      throw new ConvexError("Your workspace is on the Pro tier, which is limited to 5 connected social pages. Please upgrade to Agency in Settings.");
    }

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

/**
 * Deletes a social page and all associated posts and comments.
 */
export const remove = mutation({
  args: {
    pageId: v.id("socialPages"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Social page not found");
    }

    await verifyMembershipByClient(ctx, page.clientId);

    // Cascade delete posts on this page
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();

    for (const post of posts) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      await ctx.db.delete(post._id);
    }

    // Cascade delete transactions bound to this page
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();
    for (const tx of transactions) {
      if (tx.receiptStorageId) {
        try {
          await ctx.storage.delete(tx.receiptStorageId);
        } catch (err) {
          console.error("Failed to delete transaction receipt storage:", err);
        }
      }
      await ctx.db.delete(tx._id);
    }

    await ctx.db.delete(args.pageId);
    return { success: true };
  },
});

