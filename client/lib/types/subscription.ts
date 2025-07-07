export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  limits: {
    transactions: number | null;
    bankAccounts: number | null;
    documentUploads: number | null;
  };
  stripePriceId?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "CAD",
    interval: "month",
    features: [
      "100 transactions per month",
      "1 bank account",
      "10 document uploads per month",
      "Basic reports",
      "Email support",
    ],
    limits: {
      transactions: 100,
      bankAccounts: 1,
      documentUploads: 10,
    },
  },
  {
    id: "professional",
    name: "Professional",
    price: 19,
    currency: "CAD",
    interval: "month",
    features: [
      "1,000 transactions per month",
      "5 bank accounts",
      "100 document uploads per month",
      "All report types",
      "Bank sync with Plaid",
      "Priority email support",
      "Export to Excel",
      "Auto-reconciliation",
    ],
    limits: {
      transactions: 1000,
      bankAccounts: 5,
      documentUploads: 100,
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
  },
  {
    id: "business",
    name: "Business",
    price: 49,
    currency: "CAD",
    interval: "month",
    features: [
      "Unlimited transactions",
      "Unlimited bank accounts",
      "Unlimited document uploads",
      "All features included",
      "Priority support",
      "Advanced reconciliation",
      "Bulk operations",
      "Audit trail",
    ],
    limits: {
      transactions: null,
      bankAccounts: null,
      documentUploads: null,
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  },
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export function getPlanByPriceId(priceId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.stripePriceId === priceId);
}