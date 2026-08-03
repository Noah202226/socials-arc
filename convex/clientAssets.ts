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
 * Lists all inventory assets belonging to a specific client.
 */
export const listByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return [];

    await verifyMembership(ctx, client.workspaceId);

    return await ctx.db
      .query("clientAssets")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

/**
 * Lists all inventory assets in a workspace across all clients.
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    return await ctx.db
      .query("clientAssets")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/**
 * Calculates financial P&L, inventory valuation, and total net amount for a client or across workspace clients.
 */
export const getClientNetSummary = query({
  args: {
    workspaceId: v.id("workspaces"),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);

    // 1. Fetch relevant clients
    let clients = [];
    if (args.clientId) {
      const c = await ctx.db.get(args.clientId);
      if (c && c.workspaceId === args.workspaceId) clients.push(c);
    } else {
      clients = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();
    }

    const summaries: Record<string, {
      clientId: string;
      clientName: string;
      totalIncome: number; // cents
      totalExpense: number; // cents
      financialNet: number; // cents
      assetValuation: number; // cents
      totalClientNetWorth: number; // cents
      assetCount: number;
    }> = {};

    let globalTotalIncome = 0;
    let globalTotalExpense = 0;
    let globalAssetValuation = 0;

    for (const client of clients) {
      summaries[client._id] = {
        clientId: client._id,
        clientName: client.name,
        totalIncome: 0,
        totalExpense: 0,
        financialNet: 0,
        assetValuation: 0,
        totalClientNetWorth: 0,
        assetCount: 0,
      };

      // 2. Fetch all social pages under client
      const pages = await ctx.db
        .query("socialPages")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const page of pages) {
        const txs = await ctx.db
          .query("transactions")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .collect();

        for (const tx of txs) {
          if (tx.type === "income") {
            summaries[client._id].totalIncome += tx.amount;
            globalTotalIncome += tx.amount;
          } else {
            summaries[client._id].totalExpense += tx.amount;
            globalTotalExpense += tx.amount;
          }
        }
      }

      summaries[client._id].financialNet = summaries[client._id].totalIncome - summaries[client._id].totalExpense;

      // 3. Fetch assets under client
      const assets = await ctx.db
        .query("clientAssets")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      summaries[client._id].assetCount = assets.length;
      for (const asset of assets) {
        summaries[client._id].assetValuation += asset.totalValue;
        globalAssetValuation += asset.totalValue;
      }

      summaries[client._id].totalClientNetWorth = summaries[client._id].financialNet + summaries[client._id].assetValuation;
    }

    const globalFinancialNet = globalTotalIncome - globalTotalExpense;
    const globalTotalNetWorth = globalFinancialNet + globalAssetValuation;

    return {
      summariesByClient: summaries,
      workspaceTotals: {
        totalIncome: globalTotalIncome,
        totalExpense: globalTotalExpense,
        financialNet: globalFinancialNet,
        assetValuation: globalAssetValuation,
        totalClientNetWorth: globalTotalNetWorth,
      },
    };
  },
});

/**
 * Creates a new client inventory asset.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    clientId: v.id("clients"),
    name: v.string(),
    category: v.union(
      v.literal("hardware"),
      v.literal("digital_asset"),
      v.literal("inventory_stock"),
      v.literal("license_domain"),
      v.literal("other")
    ),
    quantity: v.number(),
    unitValue: v.number(), // integer cents
    currency: v.optional(v.string()),
    acquisitionDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await verifyMembership(ctx, args.workspaceId);

    const client = await ctx.db.get(args.clientId);
    if (!client || client.workspaceId !== args.workspaceId) {
      throw new ConvexError("Client not found in workspace");
    }

    const qty = Math.max(1, Math.round(args.quantity));
    const unitValCents = Math.max(0, Math.round(args.unitValue));
    const totalValCents = qty * unitValCents;

    const assetId = await ctx.db.insert("clientAssets", {
      workspaceId: args.workspaceId,
      clientId: args.clientId,
      name: args.name.trim(),
      category: args.category,
      quantity: qty,
      unitValue: unitValCents,
      totalValue: totalValCents,
      currency: args.currency || "PHP",
      acquisitionDate: args.acquisitionDate || Date.now(),
      notes: args.notes?.trim(),
      createdBy: identity.subject,
    });

    return await ctx.db.get(assetId);
  },
});

/**
 * Updates an existing client inventory asset.
 */
export const update = mutation({
  args: {
    assetId: v.id("clientAssets"),
    name: v.string(),
    category: v.union(
      v.literal("hardware"),
      v.literal("digital_asset"),
      v.literal("inventory_stock"),
      v.literal("license_domain"),
      v.literal("other")
    ),
    quantity: v.number(),
    unitValue: v.number(), // integer cents
    currency: v.optional(v.string()),
    acquisitionDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new ConvexError("Asset not found");

    await verifyMembership(ctx, asset.workspaceId);

    const qty = Math.max(1, Math.round(args.quantity));
    const unitValCents = Math.max(0, Math.round(args.unitValue));
    const totalValCents = qty * unitValCents;

    await ctx.db.patch(args.assetId, {
      name: args.name.trim(),
      category: args.category,
      quantity: qty,
      unitValue: unitValCents,
      totalValue: totalValCents,
      currency: args.currency || asset.currency || "PHP",
      acquisitionDate: args.acquisitionDate,
      notes: args.notes?.trim(),
    });

    return await ctx.db.get(args.assetId);
  },
});

/**
 * Deletes a client inventory asset.
 */
export const remove = mutation({
  args: {
    assetId: v.id("clientAssets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new ConvexError("Asset not found");

    await verifyMembership(ctx, asset.workspaceId);

    await ctx.db.delete(args.assetId);
    return { success: true };
  },
});
