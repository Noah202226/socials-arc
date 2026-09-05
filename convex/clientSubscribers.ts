import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
 * Helper to compute next cycle timestamp (+1 year, +1 month, +3 months)
 */
function computeNextDueDate(baseDate: number, cycle: "annual" | "monthly" | "quarterly"): number {
  const d = new Date(baseDate);
  if (cycle === "annual") {
    d.setFullYear(d.getFullYear() + 1);
  } else if (cycle === "quarterly") {
    d.setMonth(d.getMonth() + 3);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.getTime();
}

/**
 * Lists all customer subscribers under a specific client (e.g. Cliniqly's dental clinics).
 * Dynamically computes payment due statuses, countdowns, and summary rollups.
 */
export const listByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return { subscribers: [], summary: null };

    await verifyMembership(ctx, client.workspaceId);

    const subscribers = await ctx.db
      .query("clientSubscribers")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    const now = Date.now();
    let totalARR = 0;
    let totalMRR = 0;
    let paidCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    const enriched = await Promise.all(
      subscribers.map(async (sub) => {
        let receiptUrl: string | null = null;
        if (sub.receiptStorageId) {
          receiptUrl = await ctx.storage.getUrl(sub.receiptStorageId);
        }

        // Dynamic status check based on current time vs nextPaymentDueDate
        const diffMs = sub.nextPaymentDueDate - now;
        const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
        let computedStatus: "paid" | "due_soon" | "overdue" = "paid";

        if (diffMs < 0) {
          computedStatus = "overdue";
          overdueCount += 1;
        } else if (days <= 30) {
          computedStatus = "due_soon";
          dueSoonCount += 1;
        } else {
          computedStatus = "paid";
          paidCount += 1;
        }

        // Annualized & Monthly calculations
        let arr = 0;
        let mrr = 0;
        if (sub.billingCycle === "annual") {
          arr = sub.amount;
          mrr = Math.round(sub.amount / 12);
        } else if (sub.billingCycle === "quarterly") {
          arr = sub.amount * 4;
          mrr = Math.round((sub.amount * 4) / 12);
        } else {
          arr = sub.amount * 12;
          mrr = sub.amount;
        }

        if (sub.status === "active") {
          totalARR += arr;
          totalMRR += mrr;
        }

        return {
          ...sub,
          receiptUrl,
          computedPaymentStatus: computedStatus,
          daysUntilDue: days,
          arrAmount: arr,
          mrrAmount: mrr,
        };
      })
    );

    // Sort by due date ascending (earliest due first)
    enriched.sort((a, b) => a.nextPaymentDueDate - b.nextPaymentDueDate);

    return {
      subscribers: enriched,
      summary: {
        totalSubscribers: subscribers.length,
        activeSubscribers: subscribers.filter((s) => s.status === "active").length,
        totalARR,
        totalMRR,
        paidCount,
        dueSoonCount,
        overdueCount,
      },
    };
  },
});

/**
 * Creates a new customer subscriber under a client.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    clientId: v.id("clients"),
    customerName: v.string(),
    contactPerson: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    planName: v.string(),
    billingCycle: v.union(v.literal("annual"), v.literal("monthly"), v.literal("quarterly")),
    amount: v.number(),
    currency: v.string(),
    startDate: v.number(),
    nextPaymentDueDate: v.number(),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    isAlreadyPaid: v.optional(v.boolean()),
    recordInLedger: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { identity } = await verifyMembership(ctx, args.workspaceId);

    const client = await ctx.db.get(args.clientId);
    if (!client || client.workspaceId !== args.workspaceId) {
      throw new ConvexError("Client account not found in this workspace");
    }

    let finalNextDue = args.nextPaymentDueDate;
    let lastPaidDate: number | undefined = undefined;
    let lastPaidAmount: number | undefined = undefined;
    let paymentStatus: "paid" | "due_soon" | "overdue" | "unpaid" = "unpaid";

    if (args.isAlreadyPaid) {
      lastPaidDate = args.startDate || Date.now();
      lastPaidAmount = args.amount;
      paymentStatus = "paid";

      // If already paid for this cycle and next due date is equal to start date, advance by 1 cycle
      if (finalNextDue <= lastPaidDate) {
        finalNextDue = computeNextDueDate(lastPaidDate, args.billingCycle);
      }
    }

    const subscriberId = await ctx.db.insert("clientSubscribers", {
      workspaceId: args.workspaceId,
      clientId: args.clientId,
      customerName: args.customerName.trim(),
      contactPerson: args.contactPerson?.trim() || undefined,
      contactEmail: args.contactEmail?.trim() || undefined,
      contactPhone: args.contactPhone?.trim() || undefined,
      planName: args.planName.trim(),
      billingCycle: args.billingCycle,
      amount: Math.round(args.amount),
      currency: args.currency || "PHP",
      status: "active",
      paymentStatus,
      startDate: args.startDate,
      lastPaymentDate: lastPaidDate,
      lastPaymentAmount: lastPaidAmount,
      nextPaymentDueDate: finalNextDue,
      paymentMethod: args.paymentMethod?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      receiptStorageId: args.receiptStorageId,
      createdBy: identity.subject,
    });

    // Optionally record initial payment into client's transaction ledger
    if (args.isAlreadyPaid && args.recordInLedger) {
      await ctx.db.insert("transactions", {
        workspaceId: args.workspaceId,
        clientId: args.clientId,
        type: "income",
        category: args.billingCycle === "annual" ? "annual_contract" : "retainer",
        amount: Math.round(args.amount),
        currency: args.currency || "PHP",
        date: lastPaidDate || Date.now(),
        description: `Annual Subscription Payment: ${args.customerName} (${args.planName})`,
        recurring: true,
        recurrenceInterval: args.billingCycle === "annual" ? "yearly" : "monthly",
        billingFrequency: args.billingCycle === "annual" ? "yearly" : "monthly",
        receiptStorageId: args.receiptStorageId,
        createdBy: identity.subject,
      });
    }

    return subscriberId;
  },
});

/**
 * Updates an existing customer subscriber.
 */
export const update = mutation({
  args: {
    subscriberId: v.id("clientSubscribers"),
    customerName: v.string(),
    contactPerson: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    planName: v.string(),
    billingCycle: v.union(v.literal("annual"), v.literal("monthly"), v.literal("quarterly")),
    amount: v.number(),
    nextPaymentDueDate: v.number(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("canceled")),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    startDate: v.optional(v.number()),
    lastPaymentDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db.get(args.subscriberId);
    if (!subscriber) throw new ConvexError("Subscriber record not found");

    await verifyMembership(ctx, subscriber.workspaceId);

    await ctx.db.patch(args.subscriberId, {
      customerName: args.customerName.trim(),
      contactPerson: args.contactPerson?.trim() || undefined,
      contactEmail: args.contactEmail?.trim() || undefined,
      contactPhone: args.contactPhone?.trim() || undefined,
      planName: args.planName.trim(),
      billingCycle: args.billingCycle,
      amount: Math.round(args.amount),
      nextPaymentDueDate: args.nextPaymentDueDate,
      status: args.status,
      paymentMethod: args.paymentMethod?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      ...(args.startDate !== undefined ? { startDate: args.startDate } : {}),
      ...(args.lastPaymentDate !== undefined ? { lastPaymentDate: args.lastPaymentDate } : {}),
    });
  },
});

/**
 * Records an annual/monthly renewal payment for a customer subscriber.
 * Automatically advances the next renewal due date (+1 year for annual) and optionally inserts into ledger.
 */
export const recordPayment = mutation({
  args: {
    subscriberId: v.id("clientSubscribers"),
    amount: v.number(),
    paymentDate: v.number(),
    paymentMethod: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    autoAdvanceDueDate: v.optional(v.boolean()),
    customNextDueDate: v.optional(v.number()),
    recordInLedger: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db.get(args.subscriberId);
    if (!subscriber) throw new ConvexError("Subscriber not found");

    const { identity } = await verifyMembership(ctx, subscriber.workspaceId);

    // Compute new next renewal due date
    let newDueDate = subscriber.nextPaymentDueDate;
    if (args.customNextDueDate) {
      newDueDate = args.customNextDueDate;
    } else if (args.autoAdvanceDueDate !== false) {
      // Calculate from current due date or payment date, whichever is later
      const baseDate = Math.max(subscriber.nextPaymentDueDate, args.paymentDate);
      newDueDate = computeNextDueDate(baseDate, subscriber.billingCycle);
    }

    // Update subscriber record
    await ctx.db.patch(args.subscriberId, {
      lastPaymentDate: args.paymentDate,
      lastPaymentAmount: Math.round(args.amount),
      nextPaymentDueDate: newDueDate,
      paymentStatus: "paid",
      paymentMethod: args.paymentMethod || subscriber.paymentMethod,
      receiptStorageId: args.receiptStorageId || subscriber.receiptStorageId,
      notes: args.notes || subscriber.notes,
    });

    // Record into client's transaction ledger
    if (args.recordInLedger !== false) {
      await ctx.db.insert("transactions", {
        workspaceId: subscriber.workspaceId,
        clientId: subscriber.clientId,
        type: "income",
        category: subscriber.billingCycle === "annual" ? "annual_contract" : "retainer",
        amount: Math.round(args.amount),
        currency: subscriber.currency || "PHP",
        date: args.paymentDate,
        description: `Subscription Renewal: ${subscriber.customerName} (${subscriber.planName})`,
        recurring: true,
        recurrenceInterval: subscriber.billingCycle === "annual" ? "yearly" : "monthly",
        billingFrequency: subscriber.billingCycle === "annual" ? "yearly" : "monthly",
        receiptStorageId: args.receiptStorageId,
        createdBy: identity.subject,
      });
    }

    return {
      success: true,
      nextPaymentDueDate: newDueDate,
    };
  },
});

/**
 * Generates an upload URL for subscription payment receipts / invoices.
 */
export const generateReceiptUploadUrl = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await verifyMembership(ctx, args.workspaceId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Deletes a subscriber record.
 */
export const remove = mutation({
  args: {
    subscriberId: v.id("clientSubscribers"),
  },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db.get(args.subscriberId);
    if (!subscriber) throw new ConvexError("Subscriber not found");

    await verifyMembership(ctx, subscriber.workspaceId);
    await ctx.db.delete(args.subscriberId);
  },
});
