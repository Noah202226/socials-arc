import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Verifies that the authenticated user is a member of the workspace associated with a client.
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
 * Creates a new project under a client.
 */
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByClient(ctx, args.clientId);

    const projectId = await ctx.db.insert("projects", {
      clientId: args.clientId,
      name: args.name,
      description: args.description,
      status: "active",
    });

    return await ctx.db.get(projectId);
  },
});

/**
 * Lists all projects under a client.
 */
export const listByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByClient(ctx, args.clientId);

    return await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

/**
 * Lists all projects in a workspace.
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    await verifyMembershipDirect(ctx, args.workspaceId);

    // Fetch all clients in the workspace
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const clientIds = clients.map((c) => c._id);
    const allProjects = [];

    // Query projects for each client
    for (const clientId of clientIds) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
      
      allProjects.push(...projects);
    }

    // Filter by status if provided (since we have clientIds list we did a manual rollup)
    if (args.status) {
      return allProjects.filter((p) => p.status === args.status);
    }

    return allProjects;
  },
});

/**
 * Updates status of a project.
 */
export const updateStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }

    await verifyMembershipByClient(ctx, project.clientId);

    await ctx.db.patch(args.projectId, {
      status: args.status,
    });

    return await ctx.db.get(args.projectId);
  },
});
