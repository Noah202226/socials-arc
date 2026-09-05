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
      // BNPL & Hardware Build Metrics:
      totalBnplFinanced: number; // integer cents (total financed value)
      totalBnplPaid: number; // integer cents (installments paid to date)
      remainingBnplLiability: number; // integer cents (outstanding BNPL debt)
      monthlyBnplObligation: number; // integer cents / mo for active BNPL
      bnplActiveCount: number;
      dueSoonBnplCount: number; // due in <= 7 days
      hardwarePartCounts: {
        inStock: number;
        reserved: number;
        installed: number;
        sold: number;
      };
      // Cloud Server & Transaction Metrics:
      cloudHostingExpense: number; // integer cents (spent on Hetzner / AWS / servers)
      transactionCount: number;
      // Customer Subscriber & Annual License Metrics:
      subscriberCount: number;
      subscribersARR: number; // integer cents (ARR)
      subscribersMRR: number; // integer cents (MRR)
      subscribersDueSoonCount: number;
      subscribersOverdueCount: number;
    }> = {};

    let globalTotalIncome = 0;
    let globalTotalExpense = 0;
    let globalAssetValuation = 0;
    let globalMRR = 0;
    let globalDailyIncome = 0;
    let globalMonthlyExpense = 0;
    let globalDailyExpense = 0;

    let globalTotalBnplFinanced = 0;
    let globalTotalBnplPaid = 0;
    let globalRemainingBnplLiability = 0;
    let globalMonthlyBnplObligation = 0;
    let globalBnplActiveCount = 0;
    let globalDueSoonBnplCount = 0;
    const globalHardwarePartCounts = {
      inStock: 0,
      reserved: 0,
      installed: 0,
      sold: 0,
    };

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
        totalBnplFinanced: 0,
        totalBnplPaid: 0,
        remainingBnplLiability: 0,
        monthlyBnplObligation: 0,
        bnplActiveCount: 0,
        dueSoonBnplCount: 0,
        hardwarePartCounts: {
          inStock: 0,
          reserved: 0,
          installed: 0,
          sold: 0,
        },
        cloudHostingExpense: 0,
        transactionCount: 0,
        subscriberCount: 0,
        subscribersARR: 0,
        subscribersMRR: 0,
        subscribersDueSoonCount: 0,
        subscribersOverdueCount: 0,
      };

      const seenTxIds = new Set<string>();

      // A. Fetch transactions tied directly to client
      const directTxs = await ctx.db
        .query("transactions")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      for (const tx of directTxs) {
        seenTxIds.add(tx._id);
        summaries[client._id].transactionCount += 1;

        if (
          tx.category === "cloud_vps_hosting" ||
          tx.category === "hosting_services" ||
          tx.description?.toLowerCase().includes("hetzner") ||
          tx.description?.toLowerCase().includes("server") ||
          tx.description?.toLowerCase().includes("vps")
        ) {
          summaries[client._id].cloudHostingExpense += tx.amount;
        }

        if (tx.type === "income") {
          summaries[client._id].totalIncome += tx.amount;
          globalTotalIncome += tx.amount;

          // Normalized proration: only if recurring or periodic
          // Exclude transactions generated by customer subscriber payments/renewals (their recurring run-rate is computed directly from clientSubscribers to prevent double-counting)
          const isSubscriberTx =
            tx.description?.toLowerCase().includes("subscription payment") ||
            tx.description?.toLowerCase().includes("subscription renewal");

          const isRecurring = (tx.recurring || (tx.billingFrequency && tx.billingFrequency !== "one_time")) && !isSubscriberTx;
          if (isRecurring) {
            const freq = (tx.billingFrequency && tx.billingFrequency !== "one_time" ? tx.billingFrequency : tx.recurrenceInterval) || "monthly";
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

          const isRecurring = tx.recurring || (tx.billingFrequency && tx.billingFrequency !== "one_time");
          if (isRecurring) {
            const freq = (tx.billingFrequency && tx.billingFrequency !== "one_time" ? tx.billingFrequency : tx.recurrenceInterval) || "monthly";
            if (freq === "yearly") {
              const mExpense = Math.round(tx.amount / 12);
              summaries[client._id].monthlyRecurringExpense += mExpense;
              summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 365);
            } else if (freq === "weekly") {
              const mExpense = Math.round((tx.amount * 52) / 12);
              summaries[client._id].monthlyRecurringExpense += mExpense;
              summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 7);
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
          summaries[client._id].transactionCount += 1;

          if (
            tx.category === "cloud_vps_hosting" ||
            tx.category === "hosting_services" ||
            tx.description?.toLowerCase().includes("hetzner") ||
            tx.description?.toLowerCase().includes("server") ||
            tx.description?.toLowerCase().includes("vps")
          ) {
            summaries[client._id].cloudHostingExpense += tx.amount;
          }

          if (tx.type === "income") {
            summaries[client._id].totalIncome += tx.amount;
            globalTotalIncome += tx.amount;

            const isSubscriberTx =
              tx.description?.toLowerCase().includes("subscription payment") ||
              tx.description?.toLowerCase().includes("subscription renewal");

            const isRecurring = (tx.recurring || (tx.billingFrequency && tx.billingFrequency !== "one_time")) && !isSubscriberTx;
            if (isRecurring) {
              const freq = (tx.billingFrequency && tx.billingFrequency !== "one_time" ? tx.billingFrequency : tx.recurrenceInterval) || "monthly";
              if (freq === "yearly") {
                summaries[client._id].monthlyRecurringIncome += Math.round(tx.amount / 12);
                summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 365);
              } else if (freq === "weekly") {
                summaries[client._id].monthlyRecurringIncome += Math.round((tx.amount * 52) / 12);
                summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 7);
              } else {
                summaries[client._id].monthlyRecurringIncome += tx.amount;
                summaries[client._id].dailyRecognizedIncome += Math.round(tx.amount / 30);
              }
            }
          } else {
            summaries[client._id].totalExpense += tx.amount;
            globalTotalExpense += tx.amount;

            const isRecurring = tx.recurring || (tx.billingFrequency && tx.billingFrequency !== "one_time");
            if (isRecurring) {
              const freq = (tx.billingFrequency && tx.billingFrequency !== "one_time" ? tx.billingFrequency : tx.recurrenceInterval) || "monthly";
              if (freq === "yearly") {
                summaries[client._id].monthlyRecurringExpense += Math.round(tx.amount / 12);
                summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 365);
              } else if (freq === "weekly") {
                summaries[client._id].monthlyRecurringExpense += Math.round((tx.amount * 52) / 12);
                summaries[client._id].dailyExpenseBurn += Math.round(tx.amount / 7);
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
      const now = Date.now();
      const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

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

        // BNPL Financing tracking
        if (asset.paymentMethod === "bnpl") {
          const financed = asset.bnplTotalFinanced || asset.totalValue;
          const installmentsPaid = asset.bnplInstallmentsPaid || 0;
          const monthly = asset.bnplMonthlyInstallment || 0;
          const downpayment = asset.bnplDownpayment || 0;
          const paid = (installmentsPaid * monthly) + downpayment;
          const remaining = Math.max(0, financed - paid);

          summaries[client._id].totalBnplFinanced += financed;
          summaries[client._id].totalBnplPaid += paid;
          summaries[client._id].remainingBnplLiability += remaining;

          globalTotalBnplFinanced += financed;
          globalTotalBnplPaid += paid;
          globalRemainingBnplLiability += remaining;

          if (asset.bnplStatus !== "fully_paid" && remaining > 0) {
            summaries[client._id].monthlyBnplObligation += monthly;
            summaries[client._id].bnplActiveCount += 1;
            globalMonthlyBnplObligation += monthly;
            globalBnplActiveCount += 1;

            if (asset.bnplNextDueDate && asset.bnplNextDueDate <= sevenDaysFromNow) {
              summaries[client._id].dueSoonBnplCount += 1;
              globalDueSoonBnplCount += 1;
            }
          }
        }

        // Hardware Part Build Tracking
        if (asset.category === "hardware" || asset.partType) {
          const bStatus = asset.buildStatus || "in_stock";
          if (bStatus === "in_stock") {
            summaries[client._id].hardwarePartCounts.inStock += asset.quantity;
            globalHardwarePartCounts.inStock += asset.quantity;
          } else if (bStatus === "reserved") {
            summaries[client._id].hardwarePartCounts.reserved += asset.quantity;
            globalHardwarePartCounts.reserved += asset.quantity;
          } else if (bStatus === "installed_in_pc") {
            summaries[client._id].hardwarePartCounts.installed += asset.quantity;
            globalHardwarePartCounts.installed += asset.quantity;
          } else if (bStatus === "sold") {
            summaries[client._id].hardwarePartCounts.sold += asset.quantity;
            globalHardwarePartCounts.sold += asset.quantity;
          }
        }
      }

      // D. Fetch customer subscribers under client (e.g. Cliniqly's dental clinic customers)
      const subscribers = await ctx.db
        .query("clientSubscribers")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();

      summaries[client._id].subscriberCount = subscribers.length;

      for (const sub of subscribers) {
        if (sub.status === "active") {
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

          summaries[client._id].subscribersARR += arr;
          summaries[client._id].subscribersMRR += mrr;
          summaries[client._id].dailyRecognizedIncome += Math.round(arr / 365);

          const diffMs = sub.nextPaymentDueDate - now;
          if (diffMs < 0) {
            summaries[client._id].subscribersOverdueCount += 1;
          } else if (diffMs <= 30 * 24 * 60 * 60 * 1000) {
            summaries[client._id].subscribersDueSoonCount += 1;
          }
        }
      }

      summaries[client._id].totalClientNetWorth = summaries[client._id].financialNet + summaries[client._id].assetValuation;
      summaries[client._id].dailyNetProfit = summaries[client._id].dailyRecognizedIncome - summaries[client._id].dailyExpenseBurn;

      globalMRR += summaries[client._id].monthlyRecurringIncome + summaries[client._id].subscribersMRR;
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
        // BNPL & Hardware Overview:
        totalBnplFinanced: globalTotalBnplFinanced,
        totalBnplPaid: globalTotalBnplPaid,
        remainingBnplLiability: globalRemainingBnplLiability,
        monthlyBnplObligation: globalMonthlyBnplObligation,
        bnplActiveCount: globalBnplActiveCount,
        dueSoonBnplCount: globalDueSoonBnplCount,
        hardwarePartCounts: globalHardwarePartCounts,
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
    // Payment & BNPL fields
    paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("bnpl"), v.literal("credit_card"), v.literal("other"))),
    bnplProvider: v.optional(v.string()),
    bnplOrderNumber: v.optional(v.string()),
    bnplTotalFinanced: v.optional(v.number()),
    bnplDownpayment: v.optional(v.number()),
    bnplMonthlyInstallment: v.optional(v.number()),
    bnplTotalInstallments: v.optional(v.number()),
    bnplInstallmentsPaid: v.optional(v.number()),
    bnplDueDay: v.optional(v.number()),
    bnplNextDueDate: v.optional(v.number()),
    bnplStatus: v.optional(v.union(v.literal("active"), v.literal("fully_paid"))),
    // PC Component & Build fields
    partType: v.optional(
      v.union(
        v.literal("gpu"),
        v.literal("cpu"),
        v.literal("motherboard"),
        v.literal("ram"),
        v.literal("storage"),
        v.literal("psu"),
        v.literal("case"),
        v.literal("cooling"),
        v.literal("peripheral"),
        v.literal("complete_pc"),
        v.literal("other")
      )
    ),
    buildStatus: v.optional(
      v.union(
        v.literal("in_stock"),
        v.literal("reserved"),
        v.literal("installed_in_pc"),
        v.literal("sold")
      )
    ),
    targetProjectId: v.optional(v.id("projects")),
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

    // BNPL sanitization
    const isBnpl = args.paymentMethod === "bnpl";
    const cleanBnplProvider = isBnpl ? (args.bnplProvider?.trim() || "Shopee SPayLater") : undefined;
    const cleanBnplOrderNumber = isBnpl ? (args.bnplOrderNumber?.trim() || undefined) : undefined;
    const totalFinanced = isBnpl ? (args.bnplTotalFinanced ? Math.round(args.bnplTotalFinanced) : totalValCents) : undefined;
    const downpayment = isBnpl ? (args.bnplDownpayment ? Math.round(args.bnplDownpayment) : 0) : undefined;
    const monthlyInstallment = isBnpl ? (args.bnplMonthlyInstallment ? Math.round(args.bnplMonthlyInstallment) : 0) : undefined;
    const totalInstallments = isBnpl ? (args.bnplTotalInstallments ? Math.max(1, Math.round(args.bnplTotalInstallments)) : 1) : undefined;
    const installmentsPaid = isBnpl ? (args.bnplInstallmentsPaid ? Math.max(0, Math.round(args.bnplInstallmentsPaid)) : 0) : undefined;
    const dueDay = isBnpl && args.bnplDueDay ? Math.min(31, Math.max(1, Math.round(args.bnplDueDay))) : undefined;
    const bnplStatus = isBnpl
      ? (args.bnplStatus || (installmentsPaid !== undefined && totalInstallments !== undefined && installmentsPaid >= totalInstallments ? "fully_paid" : "active"))
      : undefined;

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
      // BNPL fields
      paymentMethod: args.paymentMethod || "cash",
      bnplProvider: cleanBnplProvider,
      bnplOrderNumber: cleanBnplOrderNumber,
      bnplTotalFinanced: totalFinanced,
      bnplDownpayment: downpayment,
      bnplMonthlyInstallment: monthlyInstallment,
      bnplTotalInstallments: totalInstallments,
      bnplInstallmentsPaid: installmentsPaid,
      bnplDueDay: dueDay,
      bnplNextDueDate: args.bnplNextDueDate,
      bnplStatus: bnplStatus,
      // PC Component fields
      partType: args.partType,
      buildStatus: args.buildStatus || (args.category === "hardware" ? "in_stock" : undefined),
      targetProjectId: args.targetProjectId,
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
    // Payment & BNPL fields
    paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("bnpl"), v.literal("credit_card"), v.literal("other"))),
    bnplProvider: v.optional(v.string()),
    bnplOrderNumber: v.optional(v.string()),
    bnplTotalFinanced: v.optional(v.number()),
    bnplDownpayment: v.optional(v.number()),
    bnplMonthlyInstallment: v.optional(v.number()),
    bnplTotalInstallments: v.optional(v.number()),
    bnplInstallmentsPaid: v.optional(v.number()),
    bnplDueDay: v.optional(v.number()),
    bnplNextDueDate: v.optional(v.number()),
    bnplStatus: v.optional(v.union(v.literal("active"), v.literal("fully_paid"))),
    // PC Component & Build fields
    partType: v.optional(
      v.union(
        v.literal("gpu"),
        v.literal("cpu"),
        v.literal("motherboard"),
        v.literal("ram"),
        v.literal("storage"),
        v.literal("psu"),
        v.literal("case"),
        v.literal("cooling"),
        v.literal("peripheral"),
        v.literal("complete_pc"),
        v.literal("other")
      )
    ),
    buildStatus: v.optional(
      v.union(
        v.literal("in_stock"),
        v.literal("reserved"),
        v.literal("installed_in_pc"),
        v.literal("sold")
      )
    ),
    targetProjectId: v.optional(v.id("projects")),
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

    const isBnpl = args.paymentMethod === "bnpl";
    const totalInstallments = isBnpl
      ? (args.bnplTotalInstallments !== undefined ? Math.max(1, Math.round(args.bnplTotalInstallments)) : asset.bnplTotalInstallments)
      : undefined;
    const installmentsPaid = isBnpl
      ? (args.bnplInstallmentsPaid !== undefined ? Math.max(0, Math.round(args.bnplInstallmentsPaid)) : asset.bnplInstallmentsPaid)
      : undefined;
    const bnplStatus = isBnpl
      ? (args.bnplStatus || (installmentsPaid !== undefined && totalInstallments !== undefined && installmentsPaid >= totalInstallments ? "fully_paid" : "active"))
      : undefined;

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
      // BNPL fields
      paymentMethod: args.paymentMethod !== undefined ? args.paymentMethod : asset.paymentMethod,
      bnplProvider: isBnpl ? (args.bnplProvider !== undefined ? args.bnplProvider.trim() || undefined : asset.bnplProvider) : undefined,
      bnplOrderNumber: isBnpl ? (args.bnplOrderNumber !== undefined ? args.bnplOrderNumber.trim() || undefined : asset.bnplOrderNumber) : undefined,
      bnplTotalFinanced: isBnpl ? (args.bnplTotalFinanced !== undefined ? Math.round(args.bnplTotalFinanced) : (asset.bnplTotalFinanced || totalValCents)) : undefined,
      bnplDownpayment: isBnpl ? (args.bnplDownpayment !== undefined ? Math.round(args.bnplDownpayment) : asset.bnplDownpayment) : undefined,
      bnplMonthlyInstallment: isBnpl ? (args.bnplMonthlyInstallment !== undefined ? Math.round(args.bnplMonthlyInstallment) : asset.bnplMonthlyInstallment) : undefined,
      bnplTotalInstallments: totalInstallments,
      bnplInstallmentsPaid: installmentsPaid,
      bnplDueDay: isBnpl ? (args.bnplDueDay !== undefined ? Math.min(31, Math.max(1, Math.round(args.bnplDueDay))) : asset.bnplDueDay) : undefined,
      bnplNextDueDate: isBnpl ? (args.bnplNextDueDate !== undefined ? args.bnplNextDueDate : asset.bnplNextDueDate) : undefined,
      bnplStatus: bnplStatus,
      // PC Component fields
      partType: args.partType !== undefined ? args.partType : asset.partType,
      buildStatus: args.buildStatus !== undefined ? args.buildStatus : asset.buildStatus,
      targetProjectId: args.targetProjectId !== undefined ? args.targetProjectId : asset.targetProjectId,
    });

    return await ctx.db.get(args.assetId);
  },
});

/**
 * Records a BNPL monthly installment repayment, increments installments paid count,
 * advances the next due date, and optionally creates an expense transaction in the finance ledger.
 */
export const recordBnplPayment = mutation({
  args: {
    assetId: v.id("clientAssets"),
    paidAmount: v.optional(v.number()), // integer cents, defaults to asset.bnplMonthlyInstallment
    paymentDate: v.optional(v.number()),
    autoCreateExpense: v.optional(v.boolean()), // default true
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new ConvexError("Asset not found");

    const { identity } = await verifyMembership(ctx, asset.workspaceId);

    if (asset.paymentMethod !== "bnpl") {
      throw new ConvexError("This asset is not configured as a BNPL installment purchase");
    }

    const totalInstallments = asset.bnplTotalInstallments || 1;
    const currentPaid = asset.bnplInstallmentsPaid || 0;
    const newPaid = currentPaid + 1;
    const isFullyPaid = newPaid >= totalInstallments;
    const installmentAmount = args.paidAmount ?? (asset.bnplMonthlyInstallment || 0);

    // Calculate next due date: advance by 1 month
    let nextDueDate = asset.bnplNextDueDate;
    if (nextDueDate && !isFullyPaid) {
      const d = new Date(nextDueDate);
      d.setMonth(d.getMonth() + 1);
      nextDueDate = d.getTime();
    } else if (isFullyPaid) {
      nextDueDate = undefined;
    }

    await ctx.db.patch(args.assetId, {
      bnplInstallmentsPaid: newPaid,
      bnplStatus: isFullyPaid ? "fully_paid" : "active",
      bnplNextDueDate: nextDueDate,
    });

    // Automatically create a corresponding transaction in the finance ledger if requested
    let createdTxId = undefined;
    const shouldCreateExpense = args.autoCreateExpense ?? true;
    if (shouldCreateExpense && installmentAmount > 0) {
      const providerName = asset.bnplProvider || "BNPL";
      const orderRef = asset.bnplOrderNumber ? ` [Order: ${asset.bnplOrderNumber}]` : "";
      const noteSuffix = args.notes ? ` - Note: ${args.notes}` : "";
      const txDesc = `BNPL Installment (${newPaid}/${totalInstallments}) for ${asset.name} via ${providerName}${orderRef}${noteSuffix}`;

      createdTxId = await ctx.db.insert("transactions", {
        workspaceId: asset.workspaceId,
        clientId: asset.clientId,
        type: "expense",
        category: "hardware",
        amount: Math.round(installmentAmount),
        currency: asset.currency || "PHP",
        date: args.paymentDate || Date.now(),
        description: txDesc,
        recurring: false,
        billingFrequency: "monthly",
        createdBy: identity.subject,
      });
    }

    return {
      success: true,
      newInstallmentsPaid: newPaid,
      isFullyPaid,
      nextDueDate,
      createdTransactionId: createdTxId,
    };
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
