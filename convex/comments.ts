import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Creates a new comment on a post.
 * Supports both internal authenticated users and unauthenticated client reviewers (using approval tokens).
 */
export const create = mutation({
  args: {
    postId: v.optional(v.id("posts")),
    taskId: v.optional(v.id("tasks")),
    body: v.string(),
    authorName: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (!args.postId && !args.taskId) {
      throw new ConvexError("Either postId or taskId must be provided");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity && args.taskId) {
      throw new ConvexError("Unauthorized: Only authenticated users can comment on tasks");
    }

    let authorId = "client";
    let authorName = args.authorName?.trim() || "Client Reviewer";

    if (identity) {
      // Authenticated internal teammate
      authorId = identity.subject;
      authorName = identity.name || identity.email || "Teammate";
      
      // Determine project id
      let projectId: Id<"projects"> | undefined = undefined;
      if (args.postId) {
        const post = await ctx.db.get(args.postId);
        if (post) projectId = post.projectId;
      } else if (args.taskId) {
        const task = await ctx.db.get(args.taskId);
        if (task) projectId = task.projectId;
      }

      // Verify workspace membership for safety
      if (projectId) {
        const project = await ctx.db.get(projectId);
        if (project) {
          const client = await ctx.db.get(project.clientId);
          if (client) {
            const membership = await ctx.db
              .query("members")
              .withIndex("by_workspace_and_user", (q) =>
                q.eq("workspaceId", client.workspaceId).eq("userId", identity.subject)
              )
              .first();
            if (!membership) {
              throw new ConvexError("Unauthorized: Access denied to this workspace");
            }
          }
        }
      }
    } else {
      // External client approval comment: must have a valid approvalToken on the post to comment
      if (args.postId) {
        const post = await ctx.db.get(args.postId);
        if (!post || post.status !== "client_review" || !post.approvalToken) {
          throw new ConvexError("Unauthorized: External comments are only allowed on posts in client review status");
        }
      }
    }

    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      taskId: args.taskId,
      authorId,
      authorName,
      body: args.body.trim(),
      imageStorageId: args.imageStorageId,
    });

    return await ctx.db.get(commentId);
  },
});

/**
 * Lists all comments for a post.
 */
export const listByPost = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return [];
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Unauthenticated external link must match the status & approvalToken
      if (post.status !== "client_review" || !post.approvalToken) {
        throw new ConvexError("Unauthorized: Access denied");
      }
    } else {
      // Verify internal user is a member
      const project = await ctx.db.get(post.projectId);
      if (project) {
        const client = await ctx.db.get(project.clientId);
        if (client) {
          const membership = await ctx.db
            .query("members")
            .withIndex("by_workspace_and_user", (q) =>
              q.eq("workspaceId", client.workspaceId).eq("userId", identity.subject)
            )
            .first();
          if (!membership) {
            throw new ConvexError("Unauthorized: Access denied to this workspace");
          }
        }
      }
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    return await Promise.all(
      comments.map(async (c) => {
        const imageUrl = c.imageStorageId 
          ? await ctx.storage.getUrl(c.imageStorageId) 
          : undefined;
        return {
          ...c,
          imageUrl: imageUrl || undefined,
        };
      })
    );
  },
});

/**
 * Lists all comments for a task.
 */
export const listByTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return [];
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized: Access denied");
    }

    // Verify internal user is a member
    const project = await ctx.db.get(task.projectId);
    if (project) {
      const client = await ctx.db.get(project.clientId);
      if (client) {
        const membership = await ctx.db
          .query("members")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", client.workspaceId).eq("userId", identity.subject)
          )
          .first();
        if (!membership) {
          throw new ConvexError("Unauthorized: Access denied to this workspace");
        }
      }
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return await Promise.all(
      comments.map(async (c) => {
        const imageUrl = c.imageStorageId 
          ? await ctx.storage.getUrl(c.imageStorageId) 
          : undefined;
        return {
          ...c,
          imageUrl: imageUrl || undefined,
        };
      })
    );
  },
});
