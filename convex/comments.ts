import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Creates a new comment on a post.
 * Supports both internal authenticated users and unauthenticated client reviewers (using approval tokens).
 */
export const create = mutation({
  args: {
    postId: v.id("posts"),
    body: v.string(),
    authorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    
    let authorId = "client";
    let authorName = args.authorName?.trim() || "Client Reviewer";

    if (identity) {
      // Authenticated internal teammate
      authorId = identity.subject;
      authorName = identity.name || identity.email || "Teammate";
      
      // Verify workspace membership for safety
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
    } else {
      // External client approval comment: must have a valid approvalToken on the post to comment
      if (post.status !== "client_review" || !post.approvalToken) {
        throw new ConvexError("Unauthorized: External comments are only allowed on posts in client review status");
      }
    }

    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId,
      authorName,
      body: args.body.trim(),
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

    return await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
  },
});
