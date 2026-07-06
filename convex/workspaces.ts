import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Slugifies a string.
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

/**
 * Gets the authenticated user's workspace, or creates a default one if none exists.
 * Seeds the creator as the "owner" member.
 */
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    const userId = identity.subject;

    // Find if user is already a member of any workspace
    const existingMembership = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingMembership) {
      // Fetch and return the existing workspace
      const workspace = await ctx.db.get(existingMembership.workspaceId);
      if (workspace) {
        return workspace;
      }
    }

    // Otherwise, create a new workspace
    const userDisplayName = identity.name || identity.givenName || "My";
    const workspaceName = `${userDisplayName}'s Workspace`;
    
    // Generate a unique slug
    const baseSlug = slugify(workspaceName) || "my-workspace";
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    // Insert workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      name: workspaceName,
      slug,
      plan: "free",
      ownerId: userId,
    });

    // Insert owner member
    await ctx.db.insert("members", {
      workspaceId,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });

    const newWorkspace = await ctx.db.get(workspaceId);
    if (!newWorkspace) {
      throw new ConvexError("Failed to retrieve created workspace");
    }

    return newWorkspace;
  },
});

/**
 * Query to get the workspaces for the currently authenticated user.
 */
export const getMyWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const workspaces = [];
    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      if (workspace) {
        workspaces.push(workspace);
      }
    }

    return workspaces;
  },
});

/**
 * Fetch a workspace by slug, verifying membership for security.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!workspace) {
      return null;
    }

    // Verify user is a member of the workspace
    const membership = await ctx.db
      .query("members")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("userId", userId)
      )
      .first();

    if (!membership) {
      return null;
    }

    return workspace;
  },
});
