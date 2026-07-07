import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const payload = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET environment variable is missing.");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY environment variable is missing.");
    return new Response("Stripe key not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    // @ts-ignore
    apiVersion: "2024-12-18.acacia",
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`Received Stripe Webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const plan = session.metadata?.plan as "pro" | "agency";
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (workspaceId && plan && stripeCustomerId) {
          await ctx.runMutation(internal.workspaces.updateBilling, {
            workspaceId: workspaceId as any,
            plan,
            stripeCustomerId,
            stripeSubscriptionId,
          });
          console.log(`Successfully completed checkout session and updated workspace ${workspaceId} to ${plan}`);
        }
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;
        const stripeSubscriptionId = subscription.id;

        const workspace = await ctx.runQuery(internal.workspaces.getByStripeCustomer, {
          stripeCustomerId,
        });

        if (workspace) {
          const priceId = subscription.items.data[0]?.price.id;
          let plan: "free" | "pro" | "agency" = "pro";

          // Resolve plan type
          if (priceId === (process.env.STRIPE_PRICE_AGENCY || "price_1AgencyPlaceholder")) {
            plan = "agency";
          } else if (priceId === (process.env.STRIPE_PRICE_PRO || "price_1ProPlaceholder")) {
            plan = "pro";
          }

          // If subscription is cancelled, downgrade to free tier
          if (
            subscription.status === "canceled" || 
            subscription.status === "unpaid" || 
            subscription.status === "incomplete_expired"
          ) {
            plan = "free";
          }

          await ctx.runMutation(internal.workspaces.updateBilling, {
            workspaceId: workspace._id,
            plan,
            stripeCustomerId,
            stripeSubscriptionId,
          });
          console.log(`Successfully updated customer subscription for workspace ${workspace._id} to ${plan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const workspace = await ctx.runQuery(internal.workspaces.getByStripeCustomer, {
          stripeCustomerId,
        });

        if (workspace) {
          await ctx.runMutation(internal.workspaces.updateBilling, {
            workspaceId: workspace._id,
            plan: "free",
            stripeCustomerId: workspace.stripeCustomerId,
            stripeSubscriptionId: undefined,
          });
          console.log(`Downgraded subscription deleted customer's workspace ${workspace._id} to free`);
        }
        break;
      }
    }
  } catch (err: any) {
    console.error("Error updating billing details inside database:", err);
    return new Response("Webhook handler failed to sync database", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

// Configure webhook endpoint route
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeWebhook,
});

export default http;
