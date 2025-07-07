'use server';

import { stripe } from './config';
import { PlanType } from './client';

/**
 * Server-only Stripe functions
 * Any function that needs to be called from client components must be exported as an async function
 */

/**
 * Create a checkout session for a subscription
 */
export async function createStripeCheckoutSession(params: {
    customerId: string;
    priceId: string;
    userId: string;
    planId: PlanType;
    successUrl?: string;
    cancelUrl?: string;
}) {
    const { customerId, priceId, userId, planId, successUrl, cancelUrl } = params;

    const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: successUrl || `${process.env.NEXTAUTH_URL}/dashboard?subscription=success`,
        cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/pricing?subscription=canceled`,
        subscription_data: {
            metadata: {
                userId,
                planId,
            },
        },
    });

    return checkoutSession;
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(params: {
    email: string;
    userId: string;
    metadata?: Record<string, string>;
}) {
    const { email, userId, metadata = {} } = params;

    const customer = await stripe.customers.create({
        email,
        metadata: {
            userId,
            ...metadata,
        },
    });

    return customer;
} 