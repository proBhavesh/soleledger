// Client-side Stripe configuration - safe to use in client components
// No server-side secrets here!

export const PLANS = {
    FREE: {
        name: 'Free',
        description: 'Perfect for getting started',
        price: 0,
        priceId: null,
        features: [
            'Up to 100 transactions per month',
            '1 bank account',
            'Up to 10 document uploads per month',
            'Basic reporting',
            'Community support',
        ],
    },
    PROFESSIONAL: {
        name: 'Professional',
        description: 'For growing businesses',
        price: 39,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
        features: [
            'Up to 1,000 transactions per month',
            'Up to 5 bank accounts',
            'Up to 100 document uploads per month',
            'Advanced reporting',
            'Priority email support',
            'Export to Excel/CSV',
        ],
    },
    BUSINESS: {
        name: 'Business',
        description: 'For established businesses',
        price: 59,
        priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
        features: [
            'Unlimited transactions',
            'Unlimited bank accounts',
            'Unlimited document uploads',
            'All reporting features',
            'Priority support',
            'API access',
            'Custom integrations',
        ],
    },
};

export type PlanType = keyof typeof PLANS; 