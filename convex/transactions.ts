import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

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
 * Helper to rollup transaction amounts grouped by currency.
 */
function calculateRollup(transactions: any[]) {
  const summary: Record<string, { income: number; expense: number; net: number }> = {};
  
  for (const t of transactions) {
    const cur = t.currency || "USD";
    
    if (!summary[cur]) {
      summary[cur] = { income: 0, expense: 0, net: 0 };
    }
    
    if (t.type === "income") {
      summary[cur].income += t.amount;
      summary[cur].net += t.amount;
    } else if (t.type === "expense") {
      summary[cur].expense += t.amount;
      summary[cur].net -= t.amount;
    }
  }
  
  return summary;
}

/**
 * Creates a new transaction entry.
 */
export const create = mutation({
  args: {
    pageId: v.id("socialPages"),
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
    receiptStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { identity } = await verifyMembershipByPage(ctx, args.pageId);

    // If postId is provided, verify it belongs to the same client
    if (args.postId) {
      const post = await ctx.db.get(args.postId);
      if (!post) {
        throw new ConvexError("Post not found");
      }
      const postProject = await ctx.db.get(post.projectId);
      const targetPage = await ctx.db.get(args.pageId);
      if (postProject && targetPage && postProject.clientId !== targetPage.clientId) {
        throw new ConvexError("Post client mismatch with target social page client");
      }
    }

    const transactionId = await ctx.db.insert("transactions", {
      pageId: args.pageId,
      postId: args.postId,
      type: args.type,
      category: args.category,
      amount: Math.round(args.amount), // ensure integer cents
      currency: args.currency,
      date: args.date,
      description: args.description,
      recurring: args.recurring,
      recurrenceInterval: args.recurrenceInterval,
      receiptStorageId: args.receiptStorageId,
      createdBy: identity.subject,
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
    category: v.string(),
    amount: v.number(),
    currency: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    recurring: v.boolean(),
    recurrenceInterval: v.optional(
      v.union(v.literal("weekly"), v.literal("monthly"), v.literal("yearly"))
    ),
    receiptStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new ConvexError("Transaction not found");
    }

    await verifyMembershipByPage(ctx, transaction.pageId);

    // If postId is provided, verify it belongs to the same client
    if (args.postId) {
      const post = await ctx.db.get(args.postId);
      if (!post) {
        throw new ConvexError("Post not found");
      }
      const postProject = await ctx.db.get(post.projectId);
      const targetPage = await ctx.db.get(transaction.pageId);
      if (postProject && targetPage && postProject.clientId !== targetPage.clientId) {
        throw new ConvexError("Post client mismatch with target social page client");
      }
    }

    // Delete old receipt if it is changing
    if (
      transaction.receiptStorageId &&
      args.receiptStorageId !== undefined &&
      transaction.receiptStorageId !== args.receiptStorageId
    ) {
      await ctx.storage.delete(transaction.receiptStorageId);
    }

    await ctx.db.patch(args.transactionId, {
      postId: args.postId,
      category: args.category,
      amount: Math.round(args.amount), // ensure integer cents
      currency: args.currency,
      date: args.date,
      description: args.description,
      recurring: args.recurring,
      recurrenceInterval: args.recurrenceInterval,
      receiptStorageId: args.receiptStorageId,
    });

    return await ctx.db.get(args.transactionId);
  },
});

/**
 * Deletes a transaction and its receipt.
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

    await verifyMembershipByPage(ctx, transaction.pageId);

    if (transaction.receiptStorageId) {
      try {
        await ctx.storage.delete(transaction.receiptStorageId);
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
    pageId: v.id("socialPages"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipByPage(ctx, args.pageId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Lists transactions for a specific page.
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

    return await Promise.all(
      txs.map(async (t) => ({
        ...t,
        receiptUrl: t.receiptStorageId ? await ctx.storage.getUrl(t.receiptStorageId) : null,
      }))
    );
  },
});

/**
 * Lists all transactions in the workspace.
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembershipDirect(ctx, args.workspaceId);

    // Get all clients
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const clientIds = clients.map((c) => c._id);
    const pageIds = [];

    // Get all pages
    for (const clientId of clientIds) {
      const pages = await ctx.db
        .query("socialPages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
      pageIds.push(...pages.map((p) => p._id));
    }

    const allTxs = [];
    for (const pageId of pageIds) {
      const txs = await ctx.db
        .query("transactions")
        .withIndex("by_page", (q) => q.eq("pageId", pageId))
        .collect();
      allTxs.push(...txs);
    }

    // Sort by date descending
    allTxs.sort((a, b) => b.date - a.date);

    return await Promise.all(
      allTxs.map(async (t) => ({
        ...t,
        receiptUrl: t.receiptStorageId ? await ctx.storage.getUrl(t.receiptStorageId) : null,
      }))
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
 * Retrieves the P&L summary rollup for a specific client (sums across all pages).
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

    const pages = await ctx.db
      .query("socialPages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    const allTxs = [];
    for (const page of pages) {
      const txs = await ctx.db
        .query("transactions")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();
      allTxs.push(...txs);
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
          postId: tx.postId,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          currency: tx.currency,
          date: currentTxDate, // historical date
          description: tx.description ? `${tx.description} (Auto-logged)` : "Auto-logged recurring item",
          recurring: false, // historical record is static
          receiptStorageId: tx.receiptStorageId,
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

