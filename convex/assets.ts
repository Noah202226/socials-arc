import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Helper to verify workspace membership associated with a project.
 */
async function verifyMembershipByProject(ctx: any, projectId: any) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new ConvexError("Project not found");
  }

  const client = await ctx.db.get(project.clientId);
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

  return { identity, membership, project, client };
}

/**
 * Helper to verify workspace membership directly.
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
 * Generates a secure upload URL for files to be uploaded directly to Convex storage.
 */
export const generateUploadUrl = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByProject(ctx, args.projectId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Saves metadata of an uploaded file in the assets table.
 */
export const save = mutation({
  args: {
    projectId: v.id("projects"),
    postId: v.optional(v.id("posts")),
    taskId: v.optional(v.id("tasks")),
    storageId: v.id("_storage"),
    type: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("document")
    ),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity } = await verifyMembershipByProject(ctx, args.projectId);

    if (args.postId) {
      const post = await ctx.db.get(args.postId);
      if (!post || post.projectId !== args.projectId) {
        throw new ConvexError("Post not found or project mismatch");
      }
    }

    if (args.taskId) {
      const task = await ctx.db.get(args.taskId);
      if (!task || task.projectId !== args.projectId) {
        throw new ConvexError("Task not found or project mismatch");
      }
    }

    const assetId = await ctx.db.insert("assets", {
      projectId: args.projectId,
      postId: args.postId,
      taskId: args.taskId,
      storageId: args.storageId,
      type: args.type,
      fileName: args.fileName,
      uploadedBy: identity.subject,
    });

    const asset = await ctx.db.get(assetId);
    if (!asset) {
      throw new ConvexError("Failed to save asset details");
    }

    return {
      ...asset,
      url: await ctx.storage.getUrl(asset.storageId),
    };
  },
});

/**
 * Attaches or detaches an asset to/from a post.
 */
export const attachToPost = mutation({
  args: {
    assetId: v.id("assets"),
    postId: v.optional(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new ConvexError("Asset not found");
    }

    await verifyMembershipByProject(ctx, asset.projectId);

    if (args.postId) {
      const post = await ctx.db.get(args.postId);
      if (!post || post.projectId !== asset.projectId) {
        throw new ConvexError("Post not found or project mismatch");
      }
    }

    await ctx.db.patch(args.assetId, {
      postId: args.postId,
    });

    const updated = await ctx.db.get(args.assetId);
    if (!updated) {
      throw new ConvexError("Failed to fetch updated asset");
    }

    return {
      ...updated,
      url: await ctx.storage.getUrl(updated.storageId),
    };
  },
});

/**
 * Deletes an asset from the database and the associated file from Convex storage.
 */
export const deleteAsset = mutation({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new ConvexError("Asset not found");
    }

    await verifyMembershipByProject(ctx, asset.projectId);

    // Delete the file from Convex Storage
    try {
      await ctx.storage.delete(asset.storageId);
    } catch (err) {
      console.error("Failed to delete asset file from storage:", err);
    }

    // Delete the entry from the database
    await ctx.db.delete(args.assetId);

    return { success: true };
  },
});

/**
 * Lists all assets across all projects/clients in a workspace.
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
    const projectIds = [];

    // Fetch all projects for these clients
    for (const clientId of clientIds) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
      projectIds.push(...projects.map((p) => p._id));
    }

    const allAssets = [];
    // Fetch all assets for these projects
    for (const projectId of projectIds) {
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect();
      allAssets.push(...assets);
    }

    // Attach URLs to all fetched assets
    return await Promise.all(
      allAssets.map(async (asset) => ({
        ...asset,
        url: await ctx.storage.getUrl(asset.storageId),
      }))
    );
  },
});

/**
 * Lists assets belonging to a specific project.
 */
export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByProject(ctx, args.projectId);

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        url: await ctx.storage.getUrl(asset.storageId),
      }))
    );
  },
});

/**
 * Lists assets attached to a specific post.
 */
export const listByPost = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    await verifyMembershipByProject(ctx, post.projectId);

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    return await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        url: await ctx.storage.getUrl(asset.storageId),
      }))
    );
  },
});

/**
 * Attaches or detaches an asset to/from a task.
 */
export const attachToTask = mutation({
  args: {
    assetId: v.id("assets"),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new ConvexError("Asset not found");
    }

    await verifyMembershipByProject(ctx, asset.projectId);

    if (args.taskId) {
      const task = await ctx.db.get(args.taskId);
      if (!task || task.projectId !== asset.projectId) {
        throw new ConvexError("Task not found or project mismatch");
      }
    }

    await ctx.db.patch(args.assetId, {
      taskId: args.taskId,
    });

    const updated = await ctx.db.get(args.assetId);
    if (!updated) {
      throw new ConvexError("Failed to fetch updated asset");
    }

    return {
      ...updated,
      url: await ctx.storage.getUrl(updated.storageId),
    };
  },
});

/**
 * Lists assets attached to a specific task.
 */
export const listByTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    await verifyMembershipByProject(ctx, task.projectId);

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        url: await ctx.storage.getUrl(asset.storageId),
      }))
    );
  },
});
