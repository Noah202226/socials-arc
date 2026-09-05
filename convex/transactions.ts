import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Helper to verify workspace membership associated with a social page.
 */
async function verifyMembershipByPage(ctx: any, pageId: any) {
  const page = await ctx.db.get(pageId);
  if (!page) {
    throw new ConvexError("Social page not found");
  }

  const client = await ctx.db.get(page.clientId);
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

  return { identity, membership, page, client };
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
 * Helper to verify membership by transaction record.
 */
async function verifyMembershipByTransaction(ctx: any, transaction: any) {
  if (transaction.pageId) {
    return await verifyMembershipByPage(ctx, transaction.pageId);
  }
  if (transaction.clientId) {
    const client = await ctx.db.get(transaction.clientId);
    if (!client) throw new ConvexError("Client not found");
    return await verifyMembershipDirect(ctx, client.workspaceId);
  }
  if (transaction.workspaceId) {
    return await verifyMembershipDirect(ctx, transaction.workspaceId);
  }
  throw new ConvexError("Transaction has no valid workspace association");
}

/**
 * Helper to rollup transaction amounts grouped by currency with normalized run-rate.
 */
function calculateRollup(transactions: any[]) {
  const summary: Record<string, {
    income: number;
    expense: number;
    net: number;
    // Normalized recurring run-rates:
    mrr: number; // monthly recurring income
    dailyIncome: number; // daily recognized income
    monthlyExpense: number; // monthly recurring expense
    dailyExpense: number; // daily expense burn
    dailyNetMargin: number; // daily net pace
  }> = {};
  
  for (const t of transactions) {
    const cur = t.currency || "PHP";
    
    if (!summary[cur]) {
      summary[cur] = {
        income: 0,
        expense: 0,
        net: 0,
        mrr: 0,
        dailyIncome: 0,
        monthlyExpense: 0,
        dailyExpense: 0,
        dailyNetMargin: 0,
      };
    }
    
    if (t.type === "income") {
      summary[cur].income += t.amount;
      summary[cur].net += t.amount;

      if (t.recurring || t.billingFrequency) {
        const freq = t.billingFrequency || t.recurrenceInterval || "monthly";
        if (freq === "yearly") {
          summary[cur].mrr += Math.round(t.amount / 12);
          summary[cur].dailyIncome += Math.round(t.amount / 365);
        } else if (freq === "weekly") {
          summary[cur].mrr += Math.round((t.amount * 52) / 12);
          summary[cur].dailyIncome += Math.round(t.amount / 7);
        } else {
          summary[cur].mrr += t.amount;
          summary[cur].dailyIncome += Math.round(t.amount / 30);
        }
      }
    } else if (t.type === "expense") {
      summary[cur].expense += t.amount;
      summary[cur].net -= t.amount;

      if (t.recurring || t.billingFrequency) {
        const freq = t.billingFrequency || t.recurrenceInterval || "monthly";
        if (freq === "yearly") {
          summary[cur].monthlyExpense += Math.round(t.amount / 12);
          summary[cur].dailyExpense += Math.round(t.amount / 365);
        } else {
          summary[cur].monthlyExpense += t.amount;
          summary[cur].dailyExpense += Math.round(t.amount / 30);
        }
      }
    }

    summary[cur].dailyNetMargin = summary[cur].dailyIncome - summary[cur].dailyExpense;
  }
  
  return summary;
}

/**
 * Creates a new transaction entry (can be tied to a social page, direct client, or workspace overhead).
 */
export const create = mutation({
  args: {
    pageId: v.optional(v.id("socialPages")),
    clientId: v.optional(v.id("clients")),
    workspaceId: v.optional(v.id("workspaces")),
    postId: v.optional(v.id("posts")),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(),
    amount: v.number(),
    currency: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    recurring: v.boolean(),
    recurrenceInterval: v.optional(
      v.union(v.literal("weekly"), v.literal("monthly"), v.literal("yearly"))
    ),
    billingFrequency: v.optional(
      v.union(v.literal("one_time"), v.literal("monthly"), v.literal("yearly"))
    ),
    receiptStorageId: v.optional(v.id("_storage")),
    receiptStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    let resolvedClientId = args.clientId;
    let resolvedWorkspaceId = args.workspaceId;
    let callerIdentity: any = null;

    if (args.pageId) {
      const { identity, page, client } = await verifyMembershipByPage(ctx, args.pageId);
      callerIdentity = identity;
      resolvedClientId = client._id;
      resolvedWorkspaceId = client.workspaceId;
    } else if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      const { identity } = await verifyMembershipDirect(ctx, client.workspaceId);
      callerIdentity = identity;
      resolvedWorkspaceId = client.workspaceId;
    } else if (args.workspaceId) {
      const { identity } = await verifyMembershipDirect(ctx, args.workspaceId);
      callerIdentity = identity;
    } else {
      throw new ConvexError("Must provide at least pageId, clientId, or workspaceId");
    }

    // If postId is provided, verify it belongs to the same client
    if (args.postId) {
      const post = await ctx.db.get(args.postId);
      if (!post) {
        throw new ConvexError("Post not found");
      }
      const postProject = await ctx.db.get(post.projectId);
      if (postProject && resolvedClientId && postProject.clientId !== resolvedClientId) {
        throw new ConvexError("Post client mismatch with target client");
      }
    }

    const primaryReceiptId = args.receiptStorageId || args.receiptStorageIds?.[0];
    const allReceiptIds = args.receiptStorageIds || (args.receiptStorageId ? [args.receiptStorageId] : undefined);

    const transactionId = await ctx.db.insert("transactions", {
      pageId: args.pageId,
      clientId: resolvedClientId,
      workspaceId: resolvedWorkspaceId,
      postId: args.postId,
      type: args.type,
      category: args.category,
      amount: Math.round(args.amount), // ensure integer cents
      currency: args.currency,
      date: args.date,
      description: args.description,
      recurring: args.recurring,
      recurrenceInterval: args.recurrenceInterval,
      billingFrequency: args.billingFrequency,
      receiptStorageId: primaryReceiptId,
      receiptStorageIds: allReceiptIds,
      createdBy: callerIdentity.subject,
    });

    return await ctx.db.get(transactionId);
  },
});

/**
 * Updates an existing transaction.
 */
export const update = mutation({
  args: {
    transactionId: v.id("transactions"),
    postId: v.optional(v.id("posts")),
    clientId: v.optional(v.id("clients")),
    category: v.string(),
    amount: v.number(),
    currency: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    recurring: v.boolean(),
    recurrenceInterval: v.optional(
      v.union(v.literal("weekly"), v.literal("monthly"), v.literal("yearly"))
    ),
    billingFrequency: v.optional(
      v.union(v.literal("one_time"), v.literal("monthly"), v.literal("yearly"))
    ),
    receiptStorageId: v.optional(v.id("_storage")),
    receiptStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new ConvexError("Transaction not found");
    }

    await verifyMembershipByTransaction(ctx, transaction);

    const primaryReceiptId = args.receiptStorageId || args.receiptStorageIds?.[0];
    const allReceiptIds = args.receiptStorageIds || (args.receiptStorageId ? [args.receiptStorageId] : undefined);

    // Delete any storage files that were removed during edit
    const oldStorageIds = new Set<Id<"_storage">>();
    if (transaction.receiptStorageId) oldStorageIds.add(transaction.receiptStorageId);
    if (transaction.receiptStorageIds) {
      for (const id of transaction.receiptStorageIds) oldStorageIds.add(id);
    }
    const newStorageSet = new Set<string>(allReceiptIds || []);
    for (const oldId of oldStorageIds) {
      if (!newStorageSet.has(oldId)) {
        try {
          await ctx.storage.delete(oldId);
        } catch (err) {
          console.error("Failed to delete removed receipt from storage:", err);
        }
      }
    }

    await ctx.db.patch(args.transactionId, {
      postId: args.postId,
      clientId: args.clientId !== undefined ? args.clientId : transaction.clientId,
      category: args.category,
      amount: Math.round(args.amount), // ensure integer cents
      currency: args.currency,
      date: args.date,
      description: args.description,
      recurring: args.recurring,
      recurrenceInterval: args.recurrenceInterval,
      billingFrequency: args.billingFrequency,
      receiptStorageId: primaryReceiptId,
      receiptStorageIds: allReceiptIds,
    });

    return await ctx.db.get(args.transactionId);
  },
});

/**
 * Deletes a transaction and its receipt(s).
 */
export const deleteTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new ConvexError("Transaction not found");
    }

    await verifyMembershipByTransaction(ctx, transaction);

    const storageIds = new Set<Id<"_storage">>();
    if (transaction.receiptStorageId) storageIds.add(transaction.receiptStorageId);
    if (transaction.receiptStorageIds) {
      for (const id of transaction.receiptStorageIds) storageIds.add(id);
    }

    for (const sId of storageIds) {
      try {
        await ctx.storage.delete(sId);
      } catch (err) {
        console.error("Failed to delete receipt from storage:", err);
      }
    }

    await ctx.db.delete(args.transactionId);

    return { success: true };
  },
});

/**
 * Generates an upload URL for transaction receipts.
 */
export const generateReceiptUploadUrl = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    pageId: v.optional(v.id("socialPages")),
  },
  handler: async (ctx, args) => {
    if (args.workspaceId) {
      await verifyMembershipDirect(ctx, args.workspaceId);
    } else if (args.pageId) {
      await verifyMembershipByPage(ctx, args.pageId);
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Lists all transactions for a specific page.
 */
export const listByPage = query({
  args: {
    pageId: v.id("socialPages"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByPage(ctx, args.pageId);

    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();

    // Sort by date descending
    txs.sort((a, b) => b.date - a.date);

    return await Promise.all(
      txs.map(async (t) => {
        const ids = t.receiptStorageIds && t.receiptStorageIds.length > 0
          ? t.receiptStorageIds
          : (t.receiptStorageId ? [t.receiptStorageId] : []);
        const rawUrls = await Promise.all(ids.map(id => ctx.storage.getUrl(id)));
        const receiptUrls = rawUrls.filter((url): url is string => Boolean(url));
        const receiptUrl = t.receiptStorageId 
          ? await ctx.storage.getUrl(t.receiptStorageId) 
          : (receiptUrls[0] || null);

        return {
          ...t,
          receiptUrl,
          receiptUrls,
        };
      })
    );
  },
});

/**
 * Lists all transactions for a specific client (both direct client transactions and transactions on client's social pages).
 */
export const listByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return [];
    await verifyMembershipDirect(ctx, client.workspaceId);

    const seenIds = new Set<string>();
    const clientTxs = [];

    // Direct client transactions
    const direct = await ctx.db
      .query("transactions")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    for (const tx of direct) {
      seenIds.add(tx._id);
      clientTxs.push(tx);
    }

    // Page-level transactions
    const pages = await ctx.db
      .query("socialPages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    const pageMap = new Map<string, typeof pages[0]>();
    for (const p of pages) {
      pageMap.set(p._id, p);
    }

    for (const page of pages) {
      const pageTxs = await ctx.db
        .query("transactions")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

      for (const tx of pageTxs) {
        if (!seenIds.has(tx._id)) {
          seenIds.add(tx._id);
          clientTxs.push(tx);
        }
      }
    }

    clientTxs.sort((a, b) => b.date - a.date);

    return await Promise.all(
      clientTxs.map(async (t) => {
        const ids = t.receiptStorageIds && t.receiptStorageIds.length > 0
          ? t.receiptStorageIds
          : (t.receiptStorageId ? [t.receiptStorageId] : []);
        const rawUrls = await Promise.all(ids.map(id => ctx.storage.getUrl(id)));
        const receiptUrls = rawUrls.filter((url): url is string => Boolean(url));
        const receiptUrl = t.receiptStorageId 
          ? await ctx.storage.getUrl(t.receiptStorageId) 
          : (receiptUrls[0] || null);

        const page = t.pageId ? pageMap.get(t.pageId) : null;

        return {
          ...t,
          receiptUrl,
          receiptUrls,
          socialPage: page ? {
            _id: page._id,
            platform: page.platform,
            handle: page.handle,
          } : null,
        };
      })
    );
  },
});

/**
 * Lists all transactions in the workspace (including direct workspace, client, and page-level transactions).
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipDirect(ctx, args.workspaceId);

    const seenIds = new Set<string>();
    const allTxs = [];

    // 1. Transactions directly indexed by workspaceId
    const workspaceTxs = await ctx.db
      .query("transactions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const tx of workspaceTxs) {
      seenIds.add(tx._id);
      allTxs.push(tx);
    }

    // 2. Get all clients in workspace
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const client of clients) {
      const clientTxs = await ctx.db
        .query("transactions")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const tx of clientTxs) {
        if (!seenIds.has(tx._id)) {
          seenIds.add(tx._id);
          allTxs.push(tx);
        }
      }

      // 3. Get all pages for client
      const pages = await ctx.db
        .query("socialPages")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const page of pages) {
        const pageTxs = await ctx.db
          .query("transactions")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .collect();

        for (const tx of pageTxs) {
          if (!seenIds.has(tx._id)) {
            seenIds.add(tx._id);
            allTxs.push(tx);
          }
        }
      }
    }

    // Sort by date descending
    allTxs.sort((a, b) => b.date - a.date);

    return await Promise.all(
      allTxs.map(async (t) => {
        const ids = t.receiptStorageIds && t.receiptStorageIds.length > 0
          ? t.receiptStorageIds
          : (t.receiptStorageId ? [t.receiptStorageId] : []);
        const rawUrls = await Promise.all(ids.map(id => ctx.storage.getUrl(id)));
        const receiptUrls = rawUrls.filter((url): url is string => Boolean(url));
        const receiptUrl = t.receiptStorageId 
          ? await ctx.storage.getUrl(t.receiptStorageId) 
          : (receiptUrls[0] || null);

        return {
          ...t,
          receiptUrl,
          receiptUrls,
        };
      })
    );
  },
});

/**
 * Retrieves the P&L summary rollup for a specific page.
 */
export const getPageSummary = query({
  args: {
    pageId: v.id("socialPages"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByPage(ctx, args.pageId);

    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .collect();

    return calculateRollup(txs);
  },
});

/**
 * Retrieves the P&L summary rollup for a specific client (including direct client transactions and all pages).
 */
export const getClientSummary = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
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

    const seenTxIds = new Set<string>();
    const allTxs = [];

    // Direct client transactions
    const clientTxs = await ctx.db
      .query("transactions")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    for (const tx of clientTxs) {
      seenTxIds.add(tx._id);
      allTxs.push(tx);
    }

    // Social page transactions
    const pages = await ctx.db
      .query("socialPages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    for (const page of pages) {
      const txs = await ctx.db
        .query("transactions")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();
      for (const tx of txs) {
        if (!seenTxIds.has(tx._id)) {
          seenTxIds.add(tx._id);
          allTxs.push(tx);
        }
      }
    }

    return calculateRollup(allTxs);
  },
});

/**
 * Retrieves the full workspace-wide rollup including MRR, ARR, and normalized daily pace.
 */
export const getWorkspaceSummary = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipDirect(ctx, args.workspaceId);

    const seenIds = new Set<string>();
    const allTxs = [];

    // 1. Workspace-direct transactions
    const workspaceTxs = await ctx.db
      .query("transactions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const tx of workspaceTxs) {
      seenIds.add(tx._id);
      allTxs.push(tx);
    }

    // 2. Client & Page transactions
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const client of clients) {
      const clientTxs = await ctx.db
        .query("transactions")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const tx of clientTxs) {
        if (!seenIds.has(tx._id)) {
          seenIds.add(tx._id);
          allTxs.push(tx);
        }
      }

      const pages = await ctx.db
        .query("socialPages")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const page of pages) {
        const pageTxs = await ctx.db
          .query("transactions")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .collect();

        for (const tx of pageTxs) {
          if (!seenIds.has(tx._id)) {
            seenIds.add(tx._id);
            allTxs.push(tx);
          }
        }
      }
    }

    return calculateRollup(allTxs);
  },
});

/**
 * Processes all recurring transactions whose scheduled dates have passed.
 * For each, creates a historical record and advances the scheduled date forward.
 */
export const processRecurring = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all recurring transactions
    const recurringTxs = await ctx.db
      .query("transactions")
      .withIndex("by_recurring", (q) => q.eq("recurring", true))
      .collect();

    let processedCount = 0;

    for (const tx of recurringTxs) {
      let currentTxDate = tx.date;
      
      // If the scheduled date is in the past, process it
      while (currentTxDate <= now) {
        // 1. Create a historical copy (non-recurring)
        await ctx.db.insert("transactions", {
          pageId: tx.pageId,
          clientId: tx.clientId,
          workspaceId: tx.workspaceId,
          postId: tx.postId,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          currency: tx.currency,
          date: currentTxDate, // historical date
          description: tx.description ? `${tx.description} (Auto-logged)` : "Auto-logged recurring item",
          recurring: false, // historical record is static
          billingFrequency: tx.billingFrequency,
          receiptStorageId: tx.receiptStorageId,
          receiptStorageIds: tx.receiptStorageIds,
          createdBy: tx.createdBy,
        });

        // 2. Advance the date
        let nextDate = new Date(currentTxDate);
        if (tx.recurrenceInterval === "weekly") {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (tx.recurrenceInterval === "monthly") {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (tx.recurrenceInterval === "yearly") {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
          // Fallback to stop infinite loop if interval is invalid
          break;
        }

        currentTxDate = nextDate.getTime();
        processedCount++;
      }

      // If we processed any occurrences, update the next scheduled date
      if (currentTxDate !== tx.date) {
        await ctx.db.patch(tx._id, {
          date: currentTxDate,
        });
      }
    }

    return { processedCount };
  },
});
