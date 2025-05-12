"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getUserSubscriptionAction,
  createCheckoutSessionAction,
} from "@/lib/actions/subscription-actions";
import { PLANS, PlanType } from "@/lib/stripe/client";
import { toast } from "sonner";

type Subscription = {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIAL";
  planId: string | null;
  planName: string | null;
  amount: number | null;
  currency: string;
  trialEndsAt: string | null;
  startAt: string | null;
  endAt: string | null;
};

export default function SubscriptionDetails() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const result = await getUserSubscriptionAction();
        if (result.subscription) {
          setSubscription(result.subscription as unknown as Subscription);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleUpgrade = async (planType: PlanType) => {
    if (!subscription) return;

    setUpgrading(true);
    try {
      const result = await createCheckoutSessionAction(planType);

      if (result.error) {
        toast.error(result.error);
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const calculateTrialProgress = () => {
    if (!subscription?.trialEndsAt) return 0;

    const trialStart = new Date(subscription.startAt || Date.now());
    const trialEnd = new Date(subscription.trialEndsAt);
    const today = new Date();

    const totalDays = Math.floor(
      (trialEnd.getTime() - trialStart.getTime()) / (1000 * 3600 * 24)
    );
    const daysUsed = Math.floor(
      (today.getTime() - trialStart.getTime()) / (1000 * 3600 * 24)
    );

    return Math.min(Math.max((daysUsed / totalDays) * 100, 0), 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="h-7 w-36 bg-muted animate-pulse rounded" />
          <CardDescription className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-5 w-full bg-muted animate-pulse rounded" />
            <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Subscription</CardTitle>
          <CardDescription>
            You don&apos;t have an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Choose a plan to get started with SoleLedger</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push("/pricing")}>View Plans</Button>
        </CardFooter>
      </Card>
    );
  }

  const isTrial = subscription.status === "TRIAL";
  const isActive = subscription.status === "ACTIVE";
  const isPastDue = subscription.status === "PAST_DUE";
  const plan = subscription.planId
    ? PLANS[subscription.planId as keyof typeof PLANS]
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>
              {plan?.name || subscription.planName || "Subscription"}
            </CardTitle>
            <CardDescription>
              {isTrial
                ? "Trial Period"
                : isActive
                ? "Active Subscription"
                : "Subscription Status: " + subscription.status}
            </CardDescription>
          </div>
          <div className="flex items-center">
            {isTrial && (
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
                TRIAL
              </span>
            )}
            {isActive && (
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium">
                ACTIVE
              </span>
            )}
            {isPastDue && (
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                PAST DUE
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTrial && subscription.trialEndsAt && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Trial Period</span>
              <span className="font-medium">
                Ends {format(new Date(subscription.trialEndsAt), "MMM d, yyyy")}
              </span>
            </div>
            <Progress value={calculateTrialProgress()} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2 flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {new Date(subscription.trialEndsAt) > new Date()
                ? `Your trial ends in ${Math.ceil(
                    (new Date(subscription.trialEndsAt).getTime() -
                      new Date().getTime()) /
                      (1000 * 3600 * 24)
                  )} days`
                : "Your trial has ended"}
            </p>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Plan Features</h3>
          <ul className="space-y-1">
            {plan?.features.map((feature, i) => (
              <li key={i} className="text-sm flex items-start">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {subscription.amount && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Billing Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Plan Price</span>
              <span className="text-right">
                {subscription.currency === "USD" ? "$" : ""}
                {subscription.amount}
                {subscription.currency !== "USD"
                  ? ` ${subscription.currency}`
                  : ""}
                /month
              </span>

              {subscription.trialEndsAt && (
                <>
                  <span className="text-muted-foreground">
                    Next Billing Date
                  </span>
                  <span className="text-right">
                    {format(new Date(subscription.trialEndsAt), "MMM d, yyyy")}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {isTrial && (
          <>
            <Button
              className="w-full"
              onClick={() => router.push(`/pricing`)}
              disabled={upgrading}
            >
              Choose a Plan
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your trial gives you full access to all features
            </p>
          </>
        )}

        {isActive && subscription.planId === "BASIC" && (
          <Button
            className="w-full"
            onClick={() => handleUpgrade("PROFESSIONAL")}
            disabled={upgrading}
          >
            {upgrading ? "Processing..." : "Upgrade to Professional"}
          </Button>
        )}

        {isPastDue && (
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => router.push(`/billing`)}
          >
            Update Payment Method
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
