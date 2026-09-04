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
 * Calculates financial P&L, inventory valuation, recurring MRR/expenses, and daily run rates.
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
      totalIncome: number; // integer cents (cash received)
      totalExpense: number; // integer cents (cash spent)
      financialNet: number; // integer cents
      assetValuation: number; // integer cents (total static value)
      totalClientNetWorth: number; // integer cents
      assetCount: number;
      cloudInfrastructureCount: number;
      // Normalized Recurring Run-Rates:
      monthlyRecurringIncome: number; // integer cents MRR (e.g. 10k/mo for 120k annual)
      dailyRecognizedIncome: number; // integer cents / day
      monthlyRecurringExpense: number; // integer cents (Hetzner VPS, SaaS subscriptions)
      dailyExpenseBurn: number; // integer cents / day
      dailyNetProfit: number; // integer cents / day
    }> = {};

    let globalTotalIncome = 0;
    let globalTotalExpense = 0;
    let globalAssetValuation = 0;
    let globalMRR = 0;
    let globalDailyIncome = 0;
    let globalMonthlyExpense = 0;
    let globalDailyExpense = 0;

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
        cloudInfrastructureCount: 0,
        monthlyRecurringIncome: 0,
        dailyRecognizedIncome: 0,
        monthlyRecurringExpense: 0,
        dailyExpenseBurn: 0,
        dailyNetProfit: 0,
      };

      const seenTxIds = new Set<string>();

      // A. Fetch transactions tied directly to client
      const directTxs = await ctx.db
        .query("transactions")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const tx of directTxs) {
        seenTxIds.add(tx._id);
        if (tx.type === "income") {
          summaries[client._id].totalIncome += tx.amount;
          globalTotalIncome += tx.amount;

          // Normalized proration
          if (tx.recurring || tx.billingFrequency) {
            const freq = tx.billingFrequency || tx.recurrenceInterval || "monthly";
            if (freq === "yearly") {
              const mrr = Math.round(tx.amount / 12);
              summaries[client._id].monthlyRecurringIncome += mrr;
              summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 365);
            } else if (freq === "weekly") {
              const mrr = Math.round((tx.amount * 52) / 12);
              summaries[client._id].monthlyRecurringIncome += mrr;
              summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 7);
            } else {
              summaries[client._id].monthlyRecurringIncome += tx.amount;
              summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 30);
            }
          }
        } else {
          summaries[client._id].totalExpense += tx.amount;
          globalTotalExpense += tx.amount;

          if (tx.recurring || tx.billingFrequency) {
            const freq = tx.billingFrequency || tx.recurrenceInterval || "monthly";
            if (freq === "yearly") {
              const mExpense = Math.round(tx.amount / 12);
              summaries[client._id].monthlyRecurringExpense += mExpense;
              summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 365);
            } else {
              summaries[client._id].monthlyRecurringExpense += tx.amount;
              summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 30);
            }
          }
        }
      }

      // B. Fetch all social pages under client
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
          if (seenTxIds.has(tx._id)) continue;
          seenTxIds.add(tx._id);

          if (tx.type === "income") {
            summaries[client._id].totalIncome += tx.amount;
            globalTotalIncome += tx.amount;

            if (tx.recurring || tx.billingFrequency) {
              const freq = tx.billingFrequency || tx.recurrenceInterval || "monthly";
              if (freq === "yearly") {
                summaries[client._id].monthlyRecurringIncome += Math.round(tx.amount / 12);
                summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 365);
              } else {
                summaries[client._id].monthlyRecurringIncome += tx.amount;
                summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 30);
              }
            }
          } else {
            summaries[client._id].totalExpense += tx.amount;
            globalTotalExpense += tx.amount;

            if (tx.recurring || tx.billingFrequency) {
              const freq = tx.billingFrequency || tx.recurrenceInterval || "monthly";
              if (freq === "yearly") {
                summaries[client._id].monthlyRecurringExpense += Math.round(tx.amount / 12);
                summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 365);
              } else {
                summaries[client._id].monthlyRecurringExpense += tx.amount;
                summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 30);
              }
            }
          }
        }
      }

      summaries[client._id].financialNet = summaries[client._id].totalIncome - summaries[client._id].totalExpense;

      // C. Fetch assets & server infrastructure under client
      const assets = await ctx.db
        .query("clientAssets")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      summaries[client._id].assetCount = assets.length;
      for (const asset of assets) {
        summaries[client._id].assetValuation += asset.totalValue;
        globalAssetValuation += asset.totalValue;

        if (asset.provider || asset.category === "license_domain") {
          summaries[client._id].cloudInfrastructureCount += 1;
        }

        // Operational recurring maintenance/cloud cost
        if (asset.recurringCost && asset.recurringCost > 0) {
          if (asset.costInterval === "yearly") {
            const monthlyCost = Math.round(asset.recurringCost / 12);
            summaries[client._id].monthlyRecurringExpense += monthlyCost;
            summaries[client._id].dailyExpenseBurn += Math.round(asset.recurringCost / 365);
          } else {
            summaries[client._id].monthlyRecurringExpense += asset.recurringCost;
            summaries[client._id].dailyExpenseBurn += Math.round(asset.recurringCost / 30);
          }
        }
      }

      summaries[client._id].totalClientNetWorth = summaries[client._id].financialNet + summaries[client._id].assetValuation;
      summaries[client._id].dailyNetProfit = summaries[client._id].dailyRecognizedIncome - summaries[client._id].dailyExpenseBurn;

      globalMRR += summaries[client._id].monthlyRecurringIncome;
      globalDailyIncome += summaries[client._id].dailyRecognizedIncome;
      globalMonthlyExpense += summaries[client._id].monthlyRecurringExpense;
      globalDailyExpense += summaries[client._id].dailyExpenseBurn;
    }

    const globalFinancialNet = globalTotalIncome - globalTotalExpense;
    const globalTotalNetWorth = globalFinancialNet + globalAssetValuation;
    const globalDailyNet = globalDailyIncome - globalDailyExpense;

    return {
      summariesByClient: summaries,
      workspaceTotals: {
        totalIncome: globalTotalIncome,
        totalExpense: globalTotalExpense,
        financialNet: globalFinancialNet,
        assetValuation: globalAssetValuation,
        totalClientNetWorth: globalTotalNetWorth,
        // Normalized Recurring Overview:
        monthlyRecurringRevenue: globalMRR,
        annualRunRate: globalMRR * 12,
        dailyRecognizedIncome: globalDailyIncome,
        monthlyInfrastructureExpense: globalMonthlyExpense,
        dailyExpenseBurn: globalDailyExpense,
        dailyNetRunRate: globalDailyNet,
      },
    };
  },
});

/**
 * Creates a new client inventory asset or cloud server/license subscription.
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
    // Hardware & Device Inventory fields
    serialNumber: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    condition: v.optional(v.union(v.literal("brand_new"), v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("needs_repair"))),
    // Cloud & Server Subscription details
    provider: v.optional(v.string()),
    specsOrDetails: v.optional(v.string()),
    renewalDate: v.optional(v.number()),
    recurringCost: v.optional(v.number()),
    costInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"), v.literal("one_time"))),
    autoTrackExpense: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("maintenance"), v.literal("expired"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const { identity } = await verifyMembership(ctx, args.workspaceId);

    const client = await ctx.db.get(args.clientId);
    if (!client || client.workspaceId !== args.workspaceId) {
      throw new ConvexError("Client not found in workspace");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new ConvexError("Asset name is required and cannot be empty");
    }

    if (args.quantity === undefined || args.quantity === null || isNaN(args.quantity) || args.quantity < 1) {
      throw new ConvexError("Quantity must be at least 1");
    }

    if (args.unitValue !== undefined && (isNaN(args.unitValue) || args.unitValue < 0)) {
      throw new ConvexError("Unit value cannot be negative");
    }

    if (args.recurringCost !== undefined && (isNaN(args.recurringCost) || args.recurringCost < 0)) {
      throw new ConvexError("Recurring cost cannot be negative");
    }

    const qty = Math.max(1, Math.round(args.quantity));
    const unitValCents = Math.max(0, Math.round(args.unitValue));
    const totalValCents = qty * unitValCents;

    const cleanNotes = args.notes?.trim() || undefined;
    const cleanSerialNumber = args.serialNumber?.trim() || undefined;
    const cleanAssignedTo = args.assignedTo?.trim() || undefined;
    const cleanProvider = args.provider?.trim() || undefined;
    const cleanSpecs = args.specsOrDetails?.trim() || undefined;

    const assetId = await ctx.db.insert("clientAssets", {
      workspaceId: args.workspaceId,
      clientId: args.clientId,
      name: trimmedName,
      category: args.category,
      quantity: qty,
      unitValue: unitValCents,
      totalValue: totalValCents,
      currency: args.currency || "PHP",
      acquisitionDate: args.acquisitionDate || Date.now(),
      notes: cleanNotes,
      serialNumber: cleanSerialNumber,
      assignedTo: cleanAssignedTo,
      condition: args.condition,
      provider: cleanProvider,
      specsOrDetails: cleanSpecs,
      renewalDate: args.renewalDate,
      recurringCost: args.recurringCost ? Math.round(args.recurringCost) : undefined,
      costInterval: args.costInterval || (args.recurringCost ? "monthly" : undefined),
      autoTrackExpense: args.autoTrackExpense ?? false,
      status: args.status || "active",
      createdBy: identity.subject,
    });

    return await ctx.db.get(assetId);
  },
});

/**
 * Updates an existing client inventory asset or cloud subscription.
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
    // Hardware & Device Inventory fields
    serialNumber: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    condition: v.optional(v.union(v.literal("brand_new"), v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("needs_repair"))),
    // Cloud & Server Subscription details
    provider: v.optional(v.string()),
    specsOrDetails: v.optional(v.string()),
    renewalDate: v.optional(v.number()),
    recurringCost: v.optional(v.number()),
    costInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"), v.literal("one_time"))),
    autoTrackExpense: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("maintenance"), v.literal("expired"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new ConvexError("Asset not found");

    await verifyMembership(ctx, asset.workspaceId);

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new ConvexError("Asset name is required and cannot be empty");
    }

    if (args.quantity === undefined || args.quantity === null || isNaN(args.quantity) || args.quantity < 1) {
      throw new ConvexError("Quantity must be at least 1");
    }

    if (args.unitValue !== undefined && (isNaN(args.unitValue) || args.unitValue < 0)) {
      throw new ConvexError("Unit value cannot be negative");
    }

    if (args.recurringCost !== undefined && (isNaN(args.recurringCost) || args.recurringCost < 0)) {
      throw new ConvexError("Recurring cost cannot be negative");
    }

    const qty = Math.max(1, Math.round(args.quantity));
    const unitValCents = Math.max(0, Math.round(args.unitValue));
    const totalValCents = qty * unitValCents;

    await ctx.db.patch(args.assetId, {
      name: trimmedName,
      category: args.category,
      quantity: qty,
      unitValue: unitValCents,
      totalValue: totalValCents,
      currency: args.currency || asset.currency || "PHP",
      acquisitionDate: args.acquisitionDate,
      notes: args.notes !== undefined ? (args.notes.trim() || undefined) : asset.notes,
      serialNumber: args.serialNumber !== undefined ? (args.serialNumber.trim() || undefined) : asset.serialNumber,
      assignedTo: args.assignedTo !== undefined ? (args.assignedTo.trim() || undefined) : asset.assignedTo,
      condition: args.condition !== undefined ? args.condition : asset.condition,
      provider: args.provider !== undefined ? (args.provider.trim() || undefined) : asset.provider,
      specsOrDetails: args.specsOrDetails !== undefined ? (args.specsOrDetails.trim() || undefined) : asset.specsOrDetails,
      renewalDate: args.renewalDate !== undefined ? args.renewalDate : asset.renewalDate,
      recurringCost: args.recurringCost !== undefined ? Math.round(args.recurringCost) : asset.recurringCost,
      costInterval: args.costInterval !== undefined ? args.costInterval : asset.costInterval,
      autoTrackExpense: args.autoTrackExpense !== undefined ? args.autoTrackExpense : asset.autoTrackExpense,
      status: args.status !== undefined ? args.status : asset.status,
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
