// Client-side Stripe configuration - safe to use in client components
// No server-side secrets here!

export const PLANS = {
    BASIC: {
        name: 'Basic',
        description: 'For small businesses just getting started',
        price: 39,
        priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
        features: [
            'Unlimited transactions',
            'Basic reporting',
            'Up to 3 team members',
            'Email support',
        ],
    },
    PROFESSIONAL: {
        name: 'Professional',
        description: 'For growing businesses with more needs',
        price: 59,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
        features: [
            'Everything in Basic',
            'Advanced reporting',
            'Up to 10 team members',
            'Priority support',
            'Data exports',
            'Custom categories',
        ],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        description: 'Custom solutions for larger businesses',
        price: null, // Custom pricing
        priceId: null,
        features: [
            'Everything in Professional',
            'Unlimited team members',
            'Dedicated account manager',
            'Custom integrations',
            'Advanced analytics',
            'Enterprise-grade security',
        ],
    },
};

export type PlanType = keyof typeof PLANS; 