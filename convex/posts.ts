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

  const workspace = await ctx.db.get(client.workspaceId);
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  return { identity, membership, project, client, workspace };
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
 * Creates a new content post.
 */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    pageId: v.id("socialPages"),
    caption: v.string(),
    scheduledAt: v.optional(v.number()),
    assigneeId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, client, workspace } = await verifyMembershipByProject(ctx, args.projectId);

    if (workspace.plan === "free") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

      const clientsList = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
        .collect();
      const clientIds = clientsList.map(c => c._id);
      
      const projectIds = [];
      for (const cid of clientIds) {
        const projs = await ctx.db
          .query("projects")
          .withIndex("by_client", (q) => q.eq("clientId", cid))
          .collect();
        projectIds.push(...projs.map(p => p._id));
      }

      let monthlyPostsCount = 0;
      for (const pid of projectIds) {
        const posts = await ctx.db
          .query("posts")
          .withIndex("by_project", (q) => q.eq("projectId", pid))
          .collect();
        const thisMonthPosts = posts.filter(p => p._creationTime >= startOfMonth && p._creationTime < endOfMonth);
        monthlyPostsCount += thisMonthPosts.length;
      }

      if (monthlyPostsCount >= 5) {
        throw new ConvexError("Your workspace is on the Free tier, which is limited to 5 posts per month. Please upgrade to Pro or Agency in Settings to schedule unlimited content.");
      }
    }

    const postId = await ctx.db.insert("posts", {
      projectId: args.projectId,
      pageId: args.pageId,
      caption: args.caption,
      status: args.status || "draft",
      scheduledAt: args.scheduledAt,
      assigneeId: args.assigneeId,
      createdBy: identity.subject,
    });

    return await ctx.db.get(postId);
  },
});

/**
 * Lists all posts in a workspace.
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

    const allPosts = [];
    // Fetch all posts for these projects
    for (const projectId of projectIds) {
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect();
      allPosts.push(...posts);
    }

    return allPosts;
  },
});

/**
 * Updates details of a post.
 */
export const updateDetails = mutation({
  args: {
    postId: v.id("posts"),
    caption: v.string(),
    pageId: v.id("socialPages"),
    status: v.string(),
    scheduledAt: v.optional(v.number()),
    assigneeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    await verifyMembershipByProject(ctx, post.projectId);

    // Generate approval token if status shifts to client_review and token doesn't exist
    let approvalToken = post.approvalToken;
    if (args.status === "client_review" && !approvalToken) {
      approvalToken = "tok_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    await ctx.db.patch(args.postId, {
      caption: args.caption,
      pageId: args.pageId,
      status: args.status,
      scheduledAt: args.scheduledAt,
      assigneeId: args.assigneeId,
      approvalToken,
    });

    return await ctx.db.get(args.postId);
  },
});

/**
 * Updates status of a post directly (useful for Kanban drag/moves).
 */
export const updateStatus = mutation({
  args: {
    postId: v.id("posts"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    await verifyMembershipByProject(ctx, post.projectId);

    // Generate approval token if status shifts to client_review and token doesn't exist
    let approvalToken = post.approvalToken;
    if (args.status === "client_review" && !approvalToken) {
      approvalToken = "tok_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    await ctx.db.patch(args.postId, {
      status: args.status,
      approvalToken,
    });

    return await ctx.db.get(args.postId);
  },
});

/**
 * Deletes a post and its comments.
 */
export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    await verifyMembershipByProject(ctx, post.projectId);

    // Delete comments related to this post
    const postComments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const comment of postComments) {
      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.postId);
    return { success: true };
  },
});

/**
 * Resolves a post and its associated metadata for client review links without requiring authentication.
 */
export const getByToken = query({
  args: {
    approvalToken: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_approval_token", (q) => q.eq("approvalToken", args.approvalToken))
      .first();

    if (!post || post.status !== "client_review") {
      return null;
    }

    const project = await ctx.db.get(post.projectId);
    if (!project) return null;

    const client = await ctx.db.get(project.clientId);
    if (!client) return null;

    const page = await ctx.db.get(post.pageId);
    if (!page) return null;

    return {
      post,
      project,
      client,
      page,
    };
  },
});
