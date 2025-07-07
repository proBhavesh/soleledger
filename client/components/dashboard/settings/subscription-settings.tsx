"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  DollarSign,
  Download,
  AlertTriangle,
  Crown,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSubscriptionData,
  getBillingHistory,
  upgradeSubscription,
  cancelSubscription,
} from "@/lib/actions/subscription-actions";
import {
  type SubscriptionData,
  type BillingHistoryItem,
} from "@/lib/types/subscription-actions";

const planFeatures = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "Up to 100 transactions per month",
      "1 bank account",
      "Up to 10 document uploads per month",
      "Basic reporting",
      "Community support",
    ],
    color: "bg-gray-100 text-gray-800",
    icon: Calendar,
  },
  professional: {
    name: "Professional",
    price: 39,
    features: [
      "Up to 1,000 transactions per month",
      "Up to 5 bank accounts",
      "Up to 100 document uploads per month",
      "Advanced reporting",
      "Priority email support",
      "Export to Excel/CSV",
    ],
    color: "bg-blue-100 text-blue-800",
    icon: Zap,
  },
  business: {
    name: "Business",
    price: 59,
    features: [
      "Unlimited transactions",
      "Unlimited bank accounts",
      "Unlimited document uploads",
      "All reporting features",
      "Priority support",
      "API access",
      "Custom integrations",
    ],
    color: "bg-purple-100 text-purple-800",
    icon: Crown,
  },
};

export function SubscriptionSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>(
    []
  );

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setIsLoadingData(true);

      // Load subscription data and billing history in parallel
      const [subResult, historyResult] = await Promise.all([
        getSubscriptionData(),
        getBillingHistory(),
      ]);

      if (subResult.success && subResult.data) {
        setSubscription(subResult.data);
      } else if (subResult.error) {
        toast.error(subResult.error);
      }

      if (historyResult.success && historyResult.data) {
        setBillingHistory(historyResult.data);
      } else if (historyResult.error) {
        console.error("Failed to load billing history:", historyResult.error);
      }
    } catch {
      toast.error("Failed to load subscription data");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUpgrade = async (newPlan: keyof typeof planFeatures) => {
    if (!subscription || newPlan === subscription.plan) return;

    setIsLoading(true);
    try {
      const result = await upgradeSubscription({ plan: newPlan });

      if (result.success) {
        if ('checkoutUrl' in result && result.checkoutUrl) {
          // Redirect to Stripe checkout
          window.location.href = result.checkoutUrl;
        } else {
          toast.success("Subscription updated successfully");
          await loadSubscriptionData(); // Reload data
        }
      } else {
        toast.error(result.error || "Failed to update subscription");
      }
    } catch {
      toast.error("Failed to update subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      const result = await cancelSubscription();

      if (result.success) {
        toast.success("Subscription cancelled successfully");
        await loadSubscriptionData(); // Reload data
      } else {
        toast.error(result.error || "Failed to cancel subscription");
      }
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionData["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "past_due":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">
                Loading subscription data...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Failed to load subscription data
              </p>
              <Button onClick={loadSubscriptionData} className="mt-2">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = planFeatures[subscription.plan];
  const PlanIcon = currentPlan.icon;

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlanIcon className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={currentPlan.color}>{currentPlan.name}</Badge>
              {getStatusBadge(subscription.status)}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${subscription.amount || 0}
                <span className="text-sm font-normal text-muted-foreground">
                  /{subscription.interval || "month"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Next billing</div>
                <div className="text-sm text-muted-foreground">
                  {subscription.nextBillingDate
                    ? new Date(
                        subscription.nextBillingDate
                      ).toLocaleDateString()
                    : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Payment method</div>
                <div className="text-sm text-muted-foreground">
                  {subscription.stripeCustomerId
                    ? "•••• •••• •••• 4242"
                    : "None"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Billing cycle</div>
                <div className="text-sm text-muted-foreground">
                  {subscription.interval === "year" ? "Annual" : "Monthly"}{" "}
                  billing
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Current plan includes:</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-muted-foreground">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Upgrade or downgrade your subscription at any time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(planFeatures).map(([key, plan]) => {
              const PlanIconComponent = plan.icon;
              const isCurrentPlan = key === subscription.plan;

              return (
                <div
                  key={key}
                  className={`border rounded-lg p-4 ${
                    isCurrentPlan ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <PlanIconComponent className="h-4 w-4" />
                    <h4 className="font-medium">{plan.name}</h4>
                  </div>

                  <div className="text-2xl font-bold mb-2">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>

                  <ul className="space-y-1 text-xs text-muted-foreground mb-4">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isCurrentPlan ? "secondary" : "outline"}
                    size="sm"
                    className="w-full"
                    disabled={isCurrentPlan || isLoading}
                    onClick={() =>
                      handleUpgrade(key as keyof typeof planFeatures)
                    }
                  >
                    {isCurrentPlan ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and download your billing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length > 0 ? (
            <div className="space-y-3">
              {billingHistory.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">
                        ${invoice.amount} - {invoice.planName || "Plan"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.paymentDate
                          ? new Date(invoice.paymentDate).toLocaleDateString()
                          : new Date(invoice.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {invoice.status === "success" ? "Paid" : invoice.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No billing history available
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {subscription.status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div>
                  <div className="font-medium text-red-600">
                    Cancel Subscription
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cancel your subscription. You&apos;ll have access until the
                    end of your billing period.
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                >
                  Cancel Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
