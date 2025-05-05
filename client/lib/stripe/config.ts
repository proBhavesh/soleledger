import Stripe from 'stripe';

// This check only runs on the server
if (typeof window === 'undefined' && !process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
}

// Server-only Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-03-31.basil', // Using the supported version
    typescript: true,
}); 