"use server";

import { PLANS, PlanType } from "@/lib/stripe/client";
import {
  createStripeCustomer,
  createStripeCheckoutSession,
} from "@/lib/stripe/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { addDays, format } from "date-fns";

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
