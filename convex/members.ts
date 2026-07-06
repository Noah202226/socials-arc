import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Verifies if the authenticated user has the 'owner' or 'admin' role in the workspace.
 */
async function verifyAdminMembership(ctx: any, workspaceId: any) {
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

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new ConvexError("Unauthorized: Only workspace owners and admins can manage invites");
  }

  return { identity, membership };
}

/**
 * Verifies if the authenticated user is a member of the given workspace.
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
 * Invites a user to a workspace by email.
 */
export const invite = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("client"),
    ),
  },
  handler: async (ctx, args) => {
    await verifyAdminMembership(ctx, args.workspaceId);

    const emailNormalized = args.email.trim().toLowerCase();

    // Check if member already exists (either active or pending)
    const activeMember = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const alreadyInvited = activeMember.some(
      (m) => m.invitedEmail?.toLowerCase() === emailNormalized
    );

    if (alreadyInvited) {
      throw new ConvexError("A user with this email has already been invited or is a member of this workspace");
    }

    const memberId = await ctx.db.insert("members", {
      workspaceId: args.workspaceId,
      userId: `invited:${emailNormalized}`,
      role: args.role,
      invitedEmail: emailNormalized,
    });

    return await ctx.db.get(memberId);
  },
});

/**
 * Lists all active members in a workspace (those who have joined).
 */
export const listActiveMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Filter to active members (joinedAt is defined)
    return allMembers.filter((m) => m.joinedAt !== undefined);
  },
});

/**
 * Lists all pending invites in a workspace (those who haven't joined yet).
 */
export const listPendingInvites = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Filter to pending invites (joinedAt is undefined)
    return allMembers.filter((m) => m.joinedAt === undefined);
  },
});

/**
 * Cancels a pending invitation.
 */
export const cancelInvite = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const inviteRecord = await ctx.db.get(args.memberId);
    if (!inviteRecord) {
      throw new ConvexError("Invite not found");
    }

    await verifyAdminMembership(ctx, inviteRecord.workspaceId);

    if (inviteRecord.joinedAt !== undefined) {
      throw new ConvexError("Cannot cancel an invite that has already been accepted");
    }

    await ctx.db.delete(args.memberId);
    return { success: true };
  },
});

/**
 * Accepts a workspace invite using the logged-in user's email address.
 */
export const acceptInvite = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    const email = identity.email?.trim().toLowerCase();
    if (!email) {
      throw new ConvexError("Your authentication profile is missing a primary email address");
    }

    // Look for pending invite matching email and workspace
    const pendingInvite = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect()
      .then((records) =>
        records.find(
          (m) =>
            m.joinedAt === undefined &&
            m.invitedEmail?.toLowerCase() === email
        )
      );

    if (!pendingInvite) {
      throw new ConvexError("No pending invitation found for your email address in this workspace");
    }

    // Update member record to complete invitation accept
    await ctx.db.patch(pendingInvite._id, {
      userId: identity.subject,
      joinedAt: Date.now(),
    });

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new ConvexError("Workspace not found after accepting invite");
    }

    return workspace;
  },
});
