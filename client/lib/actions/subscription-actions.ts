"use server";

import { PLANS, PlanType } from "@/lib/stripe/client";
import {
  createStripeCustomer,
  createStripeCheckoutSession,
} from "@/lib/stripe/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { revalidatePath } from "next/cache";

/**
 * Start a 30-day trial for a user
 */
export async function startTrialAction(planType: PlanType) {
  const session = await auth();
  if (!session) {
    return { error: "Not authenticated" };
  }

  const userId = session.user.id;

  try {
    // Check if user already has a subscription
    const existingSubscription = await db.subscription.findFirst({
      where: { userId },
    });

    if (existingSubscription) {
      return { error: "User already has a subscription" };
    }

    const plan = PLANS[planType];
    const trialEndsAt = addDays(new Date(), 30); // 30-day trial

    // Create trial subscription record in database
    await db.subscription.create({
      data: {
        userId,
        status: "TRIAL",
        planId: planType,
        planName: plan.name,
        priceId: plan.priceId,
        amount: plan.price,
        interval: "month",
        trialEndsAt,
      },
    });

    return {
      success: true,
      message: `Your trial has started! It will end on ${format(
        trialEndsAt,
        "PPP"
      )}`,
      redirect: "/dashboard?subscription=trial",
    };
  } catch (error) {
    console.error("Error starting trial:", error);
    return { error: "Failed to start trial" };
  }
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSessionAction(planType: PlanType) {
  const session = await auth();
  if (!session) {
    return { error: "Not authenticated" };
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const plan = PLANS[planType];

    if (!plan.priceId) {
      return { error: "Invalid plan" };
    }

    // Get or create the customer
    const existingSubscription = await db.subscription.findFirst({
      where: { userId },
    });

    let customerId = existingSubscription?.stripeCustomerId;

    if (!customerId) {
      // Create a new customer
      if (!userEmail) {
        return { error: "User email not found" };
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
      return { error: "Failed to create checkout session" };
    }

    return { checkoutUrl: checkoutSession.url };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return { error: "Failed to create checkout" };
  }
}

/**
 * Get the user's current subscription
 */
export async function getUserSubscriptionAction() {
  const session = await auth();
  if (!session) {
    return { error: "Not authenticated" };
  }

  try {
    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return { subscription };
  } catch (error) {
    console.error("Error getting subscription:", error);
    return { error: "Failed to fetch subscription" };
  }
}

/**
 * Request a callback for the enterprise plan
 */
export async function requestEnterpriseCallbackAction(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const message = formData.get("message") as string;

  try {
    // In a real implementation, you'd send this to your CRM or email
    console.log("Enterprise request:", {
      name,
      email,
      company,
      phoneNumber,
      message,
    });

    // For now we just return success
    return {
      success: true,
      message:
        "Your request has been received! Our team will contact you shortly.",
    };
  } catch (error) {
    console.error("Error requesting enterprise callback:", error);
    return { error: "Failed to submit request" };
  }
}

// Validation schemas
const upgradeSubscriptionSchema = z.object({
  plan: z.enum(["trial", "basic", "pro", "enterprise"]),
});

export interface SubscriptionData {
  id: string;
  plan: "trial" | "basic" | "pro" | "enterprise";
  status: "active" | "cancelled" | "past_due" | "trialing";
  nextBillingDate: Date | null;
  amount: number | null;
  currency: string;
  interval: "month" | "year" | null;
  planName: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
}

export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "pending";
  paymentDate: Date | null;
  createdAt: Date;
  planName: string | null;
}

const planPricing = {
  trial: { price: 0, name: "Free Trial" },
  basic: { price: 29, name: "Basic" },
  pro: { price: 79, name: "Professional" },
  enterprise: { price: 199, name: "Enterprise" },
};

/**
 * Get current subscription data
 */
export async function getSubscriptionData(): Promise<{
  success: boolean;
  data?: SubscriptionData;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const subscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      // Create a trial subscription if none exists
      const trialSubscription = await db.subscription.create({
        data: {
          userId: session.user.id,
          status: "TRIAL",
          planName: "Free Trial",
          currency: "USD",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        },
      });

      return {
        success: true,
        data: {
          id: trialSubscription.id,
          plan: "trial",
          status: "trialing",
          nextBillingDate: trialSubscription.trialEndsAt,
          amount: 0,
          currency: trialSubscription.currency || "USD",
          interval: null,
          planName: trialSubscription.planName,
          stripeCustomerId: trialSubscription.stripeCustomerId,
          stripeSubscriptionId: trialSubscription.stripeSubscriptionId,
          trialEndsAt: trialSubscription.trialEndsAt,
          canceledAt: trialSubscription.canceledAt,
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
      if (!planName) return "trial";
      const lowerPlan = planName.toLowerCase();
      if (lowerPlan.includes("basic")) return "basic";
      if (lowerPlan.includes("pro") || lowerPlan.includes("professional"))
        return "pro";
      if (lowerPlan.includes("enterprise")) return "enterprise";
      return "trial";
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
        trialEndsAt: subscription.trialEndsAt,
        canceledAt: subscription.canceledAt,
      },
    };
  } catch (error) {
    console.error("Error getting subscription data:", error);
    return { success: false, error: "Failed to get subscription data" };
  }
}

/**
 * Get billing history
 */
export async function getBillingHistory(): Promise<{
  success: boolean;
  data?: BillingHistoryItem[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
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
    return { success: false, error: "Failed to get billing history" };
  }
}

/**
 * Upgrade subscription plan
 */
export async function upgradeSubscription(
  data: z.infer<typeof upgradeSubscriptionSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = upgradeSubscriptionSchema.parse(data);
    const planDetails = planPricing[validatedData.plan];

    // Get current subscription
    const currentSubscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (validatedData.plan === "trial") {
      return { success: false, error: "Cannot downgrade to trial plan" };
    }

    // In a real app, you would integrate with Stripe here
    // For now, we'll just update the database
    if (currentSubscription) {
      await db.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: "ACTIVE",
          planName: planDetails.name,
          amount: planDetails.price,
          currency: "USD",
          interval: "month",
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          updatedAt: new Date(),
        },
      });
    } else {
      await db.subscription.create({
        data: {
          userId: session.user.id,
          status: "ACTIVE",
          planName: planDetails.name,
          amount: planDetails.price,
          currency: "USD",
          interval: "month",
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to upgrade subscription" };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current subscription
    const currentSubscription = await db.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!currentSubscription) {
      return { success: false, error: "No active subscription found" };
    }

    // In a real app, you would cancel with Stripe here
    // For now, we'll just update the database
    await db.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: "CANCELLED",
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return { success: false, error: "Failed to cancel subscription" };
  }
}
