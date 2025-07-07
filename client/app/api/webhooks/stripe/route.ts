import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

export const runtime = "nodejs";

// Define the extended Stripe Invoice interface with missing properties
interface StripeInvoice extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription;
  payment_intent?: string | Stripe.PaymentIntent;
}

export async function POST(req: NextRequest) {
  // Retrieve the stripe signature from headers
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Missing stripe signature or webhook secret", {
      status: 400,
    });
  }

  try {
    // Get the request body as text
    const body = await req.text();

    // Verify the event
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    ) as Stripe.Event;

    // Handle the event based on its type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (
          session.subscription &&
          session.customer &&
          typeof session.customer === "string"
        ) {
          // Get the subscription
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Get metadata from the subscription
          const userId = subscription.metadata.userId;
          const planId = subscription.metadata.planId || null;

          if (!userId) {
            console.error("Missing userId in subscription metadata");
            return new NextResponse("Missing userId in metadata", {
              status: 400,
            });
          }

          const price = subscription.items.data[0].price;

          // Find existing subscription by userId and planId
          const existingSubscription = await db.subscription.findFirst({
            where: {
              userId,
              planId,
            },
          });

          if (existingSubscription) {
            // Update existing subscription
            await db.subscription.update({
              where: {
                id: existingSubscription.id,
              },
              data: {
                status: "ACTIVE",
                stripeCustomerId: session.customer,
                stripeSubscriptionId: subscription.id,
                priceId: price.id,
                amount: price.unit_amount ? price.unit_amount / 100 : null,
                currency: price.currency?.toUpperCase() || "USD",
                interval: price.recurring?.interval || "month",
                startsAt: new Date(),
                endsAt: subscription.cancel_at
                  ? new Date(subscription.cancel_at * 1000)
                  : null,
              },
            });
          } else {
            // Create new subscription
            await db.subscription.create({
              data: {
                userId,
                status: "ACTIVE",
                planId,
                planName: planId,
                stripeCustomerId: session.customer,
                stripeSubscriptionId: subscription.id,
                priceId: price.id,
                amount: price.unit_amount ? price.unit_amount / 100 : null,
                currency: price.currency?.toUpperCase() || "USD",
                interval: price.recurring?.interval || "month",
                startsAt: new Date(),
                endsAt: subscription.cancel_at
                  ? new Date(subscription.cancel_at * 1000)
                  : null,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as StripeInvoice;

        if (
          invoice.subscription &&
          invoice.customer &&
          typeof invoice.customer === "string"
        ) {
          // Find subscription by stripe subscription ID
          const subscriptionId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;

          const subscription = await db.subscription.findFirst({
            where: {
              stripeSubscriptionId: subscriptionId,
            },
          });

          if (!subscription) {
            console.error("Subscription not found for invoice:", invoice.id);
            return new NextResponse("Subscription not found", { status: 404 });
          }

          // Get payment intent ID
          const paymentIntentId =
            typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent?.id || null;

          // Create a payment record
          await db.payment.create({
            data: {
              subscriptionId: subscription.id,
              status: "SUCCESS",
              amount: invoice.amount_paid / 100, // Convert from cents
              currency: invoice.currency.toUpperCase(),
              stripeInvoiceId: invoice.id,
              stripePaymentId: paymentIntentId,
              paymentDate: new Date(),
            },
          });

          // Update subscription status
          await db.subscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              status: "ACTIVE",
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as StripeInvoice;

        if (invoice.subscription) {
          // Find subscription by stripe subscription ID
          const subscriptionId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;

          const subscription = await db.subscription.findFirst({
            where: {
              stripeSubscriptionId: subscriptionId,
            },
          });

          if (!subscription) {
            console.error(
              "Subscription not found for failed invoice:",
              invoice.id
            );
            return new NextResponse("Subscription not found", { status: 404 });
          }

          // Create a failed payment record
          await db.payment.create({
            data: {
              subscriptionId: subscription.id,
              status: "FAILED",
              amount: invoice.amount_due / 100,
              currency: invoice.currency.toUpperCase(),
              stripeInvoiceId: invoice.id,
              paymentDate: new Date(),
            },
          });

          // Update subscription status
          await db.subscription.update({
            where: {
              id: subscription.id,
            },
            data: {
              status: "PAST_DUE",
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find the subscription in our database
        const dbSubscription = await db.subscription.findFirst({
          where: {
            stripeSubscriptionId: subscription.id,
          },
        });

        if (!dbSubscription) {
          console.error("Subscription not found:", subscription.id);
          return new NextResponse("Subscription not found", { status: 404 });
        }

        // Update the subscription
        await db.subscription.update({
          where: {
            id: dbSubscription.id,
          },
          data: {
            status:
              subscription.status === "active"
                ? "ACTIVE"
                : subscription.status === "canceled"
                ? "CANCELLED"
                : subscription.status === "past_due"
                ? "PAST_DUE"
                : "INACTIVE",
            endsAt: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000)
              : null,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find the subscription in our database
        const dbSubscription = await db.subscription.findFirst({
          where: {
            stripeSubscriptionId: subscription.id,
          },
        });

        if (!dbSubscription) {
          console.error(
            "Subscription not found for deletion:",
            subscription.id
          );
          return new NextResponse("Subscription not found", { status: 404 });
        }

        // Update the subscription status
        await db.subscription.update({
          where: {
            id: dbSubscription.id,
          },
          data: {
            status: "CANCELLED",
            canceledAt: new Date(),
            endsAt: new Date(),
          },
        });
        break;
      }
    }

    return new NextResponse("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new NextResponse("Webhook error: " + (error as Error).message, {
      status: 400,
    });
  }
}
