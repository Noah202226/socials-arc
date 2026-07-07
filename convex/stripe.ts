import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import { api } from "./_generated/api";

let stripeInstance: Stripe | null = null;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ConvexError("STRIPE_SECRET_KEY environment variable is not configured");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      // @ts-ignore
      apiVersion: "2024-12-18.acacia",
    });
  }
  return stripeInstance;
}

/**
 * Creates a Stripe Checkout Session for a workspace subscription (Pro or Agency).
 */
export const pay = action({
  args: {
    workspaceId: v.id("workspaces"),
    plan: v.union(v.literal("pro"), v.literal("agency")),
    host: v.string(), // e.g. "http://localhost:3000"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    // 1. Verify user is owner/admin
    const isAdmin = await ctx.runQuery(api.workspaces.checkAdmin, {
      workspaceId: args.workspaceId,
    });
    if (!isAdmin) {
      throw new ConvexError("Unauthorized: Only workspace owners and admins can manage billing");
    }

    // 2. Fetch workspace
    const workspace = await ctx.runQuery(api.workspaces.get, {
      workspaceId: args.workspaceId,
    });
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    // 3. Resolve Stripe Price ID
    const priceId = args.plan === "pro" 
      ? (process.env.STRIPE_PRICE_PRO || "price_1ProPlaceholder")
      : (process.env.STRIPE_PRICE_AGENCY || "price_1AgencyPlaceholder");

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new ConvexError("STRIPE_SECRET_KEY environment variable is not configured");
    }

    try {
      // 4. Create Stripe Checkout Session
      const session = await getStripe().checkout.sessions.create({
        customer: workspace.stripeCustomerId || undefined,
        customer_email: workspace.stripeCustomerId ? undefined : identity.email,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${args.host}/${workspace.slug}/settings?billing_status=success`,
        cancel_url: `${args.host}/${workspace.slug}/settings?billing_status=cancelled`,
        metadata: {
          workspaceId: args.workspaceId,
          plan: args.plan,
        },
      });

      return { url: session.url };
    } catch (err: any) {
      console.error("Stripe Checkout Error:", err);
      throw new ConvexError(err.message || "Failed to initiate checkout");
    }
  },
});

/**
 * Creates a Customer Portal session so owners can manage their subscriptions (update card, cancel, view receipts).
 */
export const portal = action({
  args: {
    workspaceId: v.id("workspaces"),
    host: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    // 1. Verify user is owner/admin
    const isAdmin = await ctx.runQuery(api.workspaces.checkAdmin, {
      workspaceId: args.workspaceId,
    });
    if (!isAdmin) {
      throw new ConvexError("Unauthorized: Only workspace owners and admins can manage billing");
    }

    // 2. Fetch workspace
    const workspace = await ctx.runQuery(api.workspaces.get, {
      workspaceId: args.workspaceId,
    });
    if (!workspace || !workspace.stripeCustomerId) {
      throw new ConvexError("No billing profile found. Please subscribe first.");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new ConvexError("STRIPE_SECRET_KEY environment variable is not configured");
    }

    try {
      // 3. Create Stripe Portal Session
      const session = await getStripe().billingPortal.sessions.create({
        customer: workspace.stripeCustomerId,
        return_url: `${args.host}/${workspace.slug}/settings`,
      });

      return { url: session.url };
    } catch (err: any) {
      console.error("Stripe Portal Error:", err);
      throw new ConvexError(err.message || "Failed to open billing portal");
    }
  },
});
