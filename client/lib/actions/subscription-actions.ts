"use server";

import { PLANS, PlanType } from "@/lib/stripe/client";
import {
  createStripeCustomer,
  createStripeCheckoutSession,
} from "@/lib/stripe/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  SUBSCRIPTION_ERROR_MESSAGES,
  type SubscriptionActionResponse,
  type CheckoutSessionResponse,
  type UpgradeSubscriptionResponse,
  type CancelSubscriptionResponse,
  type SubscriptionDataResponse,
  type BillingHistoryResponse,
  type BillingHistoryItem,
  type SubscriptionData,
} from "@/lib/types/subscription-actions";

/**
 * Start a subscription for a user
 */
export async function startTrialAction(planType: PlanType): Promise<SubscriptionActionResponse> {
  const session = await auth();
  if (!session) {
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.unauthorized };
  }

  const userId = session.user.id;

  try {
    // Check if user already has a subscription
    const existingSubscription = await db.subscription.findFirst({
      where: { userId },
    });

    if (existingSubscription) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.alreadySubscribed };
    }

    const plan = PLANS[planType];

    // Create subscription record in database
    await db.subscription.create({
      data: {
        userId,
        status: "ACTIVE",
        plan: planType,
        planName: plan.name,
        priceId: plan.priceId,
        amount: plan.price || 0,
        interval: "month",
        currency: "CAD",
      },
    });

    return {
      success: true,
      message: planType === "FREE" 
        ? "Welcome! Your free account is now active."
        : `Your ${plan.name} subscription has been activated!`,
      redirect: `/dashboard?subscription=${planType.toLowerCase()}`,
    };
  } catch (error) {
    console.error("Error starting subscription:", error);
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.stripeError };
  }
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSessionAction(planType: PlanType): Promise<CheckoutSessionResponse> {
  const session = await auth();
  if (!session) {
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.unauthorized };
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const plan = PLANS[planType];

    if (!plan.priceId) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.invalidPlan };
    }

    // Get or create the customer
    const existingSubscription = await db.subscription.findFirst({
      where: { userId },
    });

    let customerId = existingSubscription?.stripeCustomerId;

    if (!customerId) {
      // Create a new customer
      if (!userEmail) {
        return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.noEmail };
      }

      const customer = await createStripeCustomer({
        email: userEmail,
        userId,
      });
      customerId = customer.id;
    }

    // Set success URL that will navigate user to dashboard with subscription flag
    const successUrl = `${process.env.NEXTAUTH_URL}/dashboard?subscription=success`;

    // Create checkout session
    const checkoutSession = await createStripeCheckoutSession({
      customerId,
      priceId: plan.priceId as string,
      userId,
      planId: planType,
      successUrl,
    });

    if (!checkoutSession.url) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.stripeError };
    }

    return { success: true, checkoutUrl: checkoutSession.url };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.stripeError };
  }
}

/**
 * Get the user's current subscription
 */
export async function getUserSubscriptionAction(): Promise<SubscriptionDataResponse> {
  const session = await auth();
  if (!session) {
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.unauthorized };
  }

  try {
    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.noSubscription };
    }

    // Map to SubscriptionData type
    const mapStatus = (dbStatus: string) => {
      switch (dbStatus) {
        case "ACTIVE":
          return "active" as const;
        case "CANCELLED":
          return "cancelled" as const;
        case "PAST_DUE":
          return "past_due" as const;
        case "TRIAL":
          return "trialing" as const;
        default:
          return "active" as const;
      }
    };

    const mapPlan = (planName: string | null) => {
      if (!planName) return "free";
      const lowerPlan = planName.toLowerCase();
      if (lowerPlan.includes("professional")) return "professional";
      if (lowerPlan.includes("business")) return "business";
      return "free";
    };

    const data: SubscriptionData = {
      id: subscription.id,
      plan: mapPlan(subscription.planName) as "free" | "professional" | "business",
      status: mapStatus(subscription.status),
      nextBillingDate: subscription.endsAt,
      amount: subscription.amount,
      currency: subscription.currency || "CAD",
      interval: subscription.interval as "month" | "year" | null,
      planName: subscription.planName,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      trialEndsAt: null,
      canceledAt: subscription.canceledAt,
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error getting subscription:", error);
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.stripeError };
  }
}


// Validation schemas
const upgradeSubscriptionSchema = z.object({
  plan: z.enum(["free", "professional", "business"]),
});


const planPricing = {
  free: { price: 0, name: "Free" },
  professional: { price: 19, name: "Professional" },
  business: { price: 49, name: "Business" },
};

/**
 * Get current subscription data
 */
export async function getSubscriptionData(): Promise<SubscriptionDataResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.unauthorized };
    }

    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      // Create a free subscription if none exists
      const freeSubscription = await db.subscription.create({
        data: {
          userId: session.user.id,
          status: "ACTIVE",
          planName: "Free",
          plan: "free",
          currency: "CAD",
          amount: 0,
        },
      });

      return {
        success: true,
        data: {
          id: freeSubscription.id,
          plan: "free",
          status: "active",
          nextBillingDate: null,
          amount: 0,
          currency: freeSubscription.currency || "CAD",
          interval: null,
          planName: freeSubscription.planName,
          stripeCustomerId: freeSubscription.stripeCustomerId,
          stripeSubscriptionId: freeSubscription.stripeSubscriptionId,
          trialEndsAt: null,
          canceledAt: freeSubscription.canceledAt,
        },
      };
    }

    // Map database status to component status
    const mapStatus = (dbStatus: string) => {
      switch (dbStatus) {
        case "ACTIVE":
          return "active" as const;
        case "CANCELLED":
          return "cancelled" as const;
        case "PAST_DUE":
          return "past_due" as const;
        case "TRIAL":
          return "trialing" as const;
        default:
          return "active" as const;
      }
    };

    // Map plan name to plan key
    const mapPlan = (planName: string | null) => {
      if (!planName) return "free";
      const lowerPlan = planName.toLowerCase();
      if (lowerPlan.includes("professional")) return "professional";
      if (lowerPlan.includes("business")) return "business";
      return "free";
    };

    return {
      success: true,
      data: {
        id: subscription.id,
        plan: mapPlan(subscription.planName),
        status: mapStatus(subscription.status),
        nextBillingDate: subscription.endsAt,
        amount: subscription.amount,
        currency: subscription.currency || "USD",
        interval: subscription.interval as "month" | "year" | null,
        planName: subscription.planName,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        trialEndsAt: null,
        canceledAt: subscription.canceledAt,
      },
    };
  } catch (error) {
    console.error("Error getting subscription data:", error);
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.stripeError };
  }
}

/**
 * Get billing history
 */
export async function getBillingHistory(): Promise<BillingHistoryResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.unauthorized };
    }

    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!subscription) {
      return { success: true, data: [] };
    }

    const billingHistory: BillingHistoryItem[] = subscription.payments.map(
      (payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status.toLowerCase() as
          | "success"
          | "failed"
          | "pending",
        paymentDate: payment.paymentDate,
        createdAt: payment.createdAt,
        planName: subscription.planName,
      })
    );

    return { success: true, data: billingHistory };
  } catch (error) {
    console.error("Error getting billing history:", error);
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.stripeError };
  }
}

/**
 * Upgrade subscription plan
 */
export async function upgradeSubscription(
  data: z.infer<typeof upgradeSubscriptionSchema>
): Promise<UpgradeSubscriptionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.unauthorized };
    }

    const validatedData = upgradeSubscriptionSchema.parse(data);
    const planDetails = planPricing[validatedData.plan];

    // Get current subscription
    const currentSubscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // If upgrading to free plan (downgrading)
    if (validatedData.plan === "free") {
      if (!currentSubscription) {
        return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.noSubscription };
      }

      // Cancel Stripe subscription if exists
      if (currentSubscription.stripeSubscriptionId) {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId);
      }

      // Update to free plan
      await db.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: "ACTIVE",
          plan: "free",
          planName: planDetails.name,
          amount: 0,
          currency: "CAD",
          interval: "month",
          stripeSubscriptionId: null,
          canceledAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return { success: true };
    }

    // For paid plans, create Stripe checkout session
    const plan = PLANS[validatedData.plan.toUpperCase() as keyof typeof PLANS];
    if (!plan || !plan.priceId) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.invalidPlan };
    }

    // Get or create Stripe customer
    let customerId = currentSubscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: session.user.email!,
        userId: session.user.id,
      });
      customerId = customer.id;
    }

    // Create checkout session for upgrade
    const checkoutSession = await createStripeCheckoutSession({
      customerId,
      priceId: plan.priceId,
      userId: session.user.id,
      planId: validatedData.plan as PlanType,
      successUrl: `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=billing&upgrade=success`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=billing`,
    });

    if (!checkoutSession.url) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.stripeError };
    }

    // Return checkout URL for redirect
    return { success: true, checkoutUrl: checkoutSession.url };
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.upgradeFailed };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<CancelSubscriptionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.unauthorized };
    }

    // Get current subscription
    const currentSubscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!currentSubscription) {
      return { success: false, error: "No active subscription found" };
    }

    // Cancel Stripe subscription if exists
    if (currentSubscription.stripeSubscriptionId) {
      const { stripe } = await import("@/lib/stripe");
      await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId);
    }

    // Downgrade to free plan
    await db.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: "ACTIVE",
        plan: "free",
        planName: "Free",
        amount: 0,
        currency: "CAD",
        stripeSubscriptionId: null,
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return { success: false, error: SUBSCRIPTION_ERROR_MESSAGES.cancelFailed };
  }
}
