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
