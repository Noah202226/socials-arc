import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Verifies workspace membership associated with a project.
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
 * Creates a new task.
 */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByProject(ctx, args.projectId);

    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      status: "todo",
      assigneeId: args.assigneeId,
      dueDate: args.dueDate,
    });

    return await ctx.db.get(taskId);
  },
});

/**
 * Lists all tasks in a workspace (collects tasks across all clients and projects).
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

    const allTasks = [];
    // Fetch all tasks for these projects
    for (const projectId of projectIds) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect();
      allTasks.push(...tasks);
    }

    return allTasks;
  },
});

/**
 * Updates status of a task.
 */
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    await verifyMembershipByProject(ctx, task.projectId);

    await ctx.db.patch(args.taskId, {
      status: args.status,
    });

    return await ctx.db.get(args.taskId);
  },
});

/**
 * Updates full task details.
 */
export const updateDetails = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    await verifyMembershipByProject(ctx, task.projectId);

    await ctx.db.patch(args.taskId, {
      title: args.title,
      description: args.description,
      assigneeId: args.assigneeId,
      dueDate: args.dueDate,
      status: args.status,
    });

    return await ctx.db.get(args.taskId);
  },
});

/**
 * Deletes a task.
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new ConvexError("Task not found");
    }

    await verifyMembershipByProject(ctx, task.projectId);

    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});
