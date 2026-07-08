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

/**
 * Creates a new client under a workspace.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    if (workspace.plan === "free") {
      const existing = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();
      if (existing.length >= 1) {
        throw new ConvexError("Your workspace is on the Free tier, which is limited to 1 Client. Please upgrade in Settings to add more.");
      }
    }

    const clientId = await ctx.db.insert("clients", {
      workspaceId: args.workspaceId,
      name: args.name,
      logoUrl: args.logoUrl,
      isActive: true,
    });

    return await ctx.db.get(clientId);
  },
});

/**
 * Lists all clients under a workspace.
 */
export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    return await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/**
 * Toggles the active status of a client.
 */
export const toggleActive = mutation({
  args: {
    clientId: v.id("clients"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError("Client not found");
    }

    await verifyMembership(ctx, client.workspaceId);

    await ctx.db.patch(args.clientId, {
      isActive: args.isActive,
    });

    return await ctx.db.get(args.clientId);
  },
});

/**
 * Deletes a client and cascade deletes all projects, social pages, and content.
 */
export const remove = mutation({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError("Client not found");
    }

    await verifyMembership(ctx, client.workspaceId);

    // 1. Delete all projects & associated content (posts, comments, tasks, assets)
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    for (const project of projects) {
      // Delete posts
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
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

      // Delete tasks
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const task of tasks) {
        await ctx.db.delete(task._id);
      }

      // Delete assets
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const asset of assets) {
        try {
          await ctx.storage.delete(asset.storageId);
        } catch (err) {
          console.error("Failed to delete asset storage:", err);
        }
        await ctx.db.delete(asset._id);
      }

      await ctx.db.delete(project._id);
    }

    // 2. Delete all social pages & associated content (posts, comments, transactions)
    const pages = await ctx.db
      .query("socialPages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    for (const page of pages) {
      // Delete posts on this page
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
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

      // Delete transactions bound to this page
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
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

      await ctx.db.delete(page._id);
    }

    // 3. Delete client
    await ctx.db.delete(args.clientId);
    return { success: true };
  },
});

