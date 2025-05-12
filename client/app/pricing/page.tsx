"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";
import {
  startTrialAction,
  createCheckoutSessionAction,
  requestEnterpriseCallbackAction,
} from "@/lib/actions/subscription-actions";
import { PLANS } from "@/lib/stripe/client";
import { toast } from "sonner";

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);

  const handlePlanSelect = async (planType: "BASIC" | "PROFESSIONAL") => {
    if (status !== "authenticated") {
      // Redirect to login if not authenticated
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }

    setIsLoading({ ...isLoading, [planType]: true });

    try {
      // Start a trial
      const result = await startTrialAction(planType);

      if (result.error) {
        toast.error(result.error);

        // If user already has subscription, try to start checkout
        if (result.error === "User already has a subscription") {
          const checkoutResult = await createCheckoutSessionAction(planType);

          if (checkoutResult.error) {
            toast.error(checkoutResult.error);
          } else if (checkoutResult.checkoutUrl) {
            // Redirect to checkout
            window.location.href = checkoutResult.checkoutUrl;
          }
        }
      } else if (result.success) {
        toast.success(result.message);

        // Check if there's a redirect URL in the response
        if (result.redirect) {
          router.push(result.redirect);
        } else {
          // Default redirect to dashboard
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error selecting plan:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading({ ...isLoading, [planType]: false });
    }
  };

  const handleEnterpriseRequest = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setIsLoading({ ...isLoading, ENTERPRISE: true });

    const formData = new FormData(e.currentTarget);

    try {
      const result = await requestEnterpriseCallbackAction(formData);

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.message);
        setShowEnterpriseForm(false);
      }
    } catch (error) {
      console.error("Error submitting enterprise request:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading({ ...isLoading, ENTERPRISE: false });
    }
  };

  return (
    <div className="container max-w-7xl py-12 md:py-24">
      <div className="mx-auto text-center max-w-3xl mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that fits your business needs, with a 30-day free
          trial - no credit card required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Basic Plan */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">{PLANS.BASIC.name}</CardTitle>
            <CardDescription>{PLANS.BASIC.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-6">
              <span className="text-4xl font-bold">${PLANS.BASIC.price}</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
            <ul className="space-y-3">
              {PLANS.BASIC.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handlePlanSelect("BASIC")}
              disabled={isLoading.BASIC}
            >
              {isLoading.BASIC ? "Processing..." : "Start Free Trial"}
            </Button>
          </CardFooter>
        </Card>

        {/* Professional Plan */}
        <Card className="flex flex-col border-primary">
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-fit mx-auto mb-2">
              Most Popular
            </div>
            <CardTitle className="text-2xl">
              {PLANS.PROFESSIONAL.name}
            </CardTitle>
            <CardDescription>{PLANS.PROFESSIONAL.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-6">
              <span className="text-4xl font-bold">
                ${PLANS.PROFESSIONAL.price}
              </span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
            <ul className="space-y-3">
              {PLANS.PROFESSIONAL.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="default"
              onClick={() => handlePlanSelect("PROFESSIONAL")}
              disabled={isLoading.PROFESSIONAL}
            >
              {isLoading.PROFESSIONAL ? "Processing..." : "Start Free Trial"}
            </Button>
          </CardFooter>
        </Card>

        {/* Enterprise Plan */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">{PLANS.ENTERPRISE.name}</CardTitle>
            <CardDescription>{PLANS.ENTERPRISE.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-6">
              <span className="text-4xl font-bold">Custom</span>
            </div>
            <ul className="space-y-3">
              {PLANS.ENTERPRISE.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowEnterpriseForm(true)}
            >
              Contact Sales
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Enterprise Contact Form */}
      {showEnterpriseForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Request Enterprise Information</CardTitle>
              <CardDescription>
                Fill out this form and our team will contact you shortly.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEnterpriseRequest}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={session?.user?.email || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" name="phoneNumber" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your business needs"
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEnterpriseForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading.ENTERPRISE}>
                  {isLoading.ENTERPRISE ? "Submitting..." : "Submit Request"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto text-left space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">
              Do I need a credit card to sign up?
            </h3>
            <p className="text-muted-foreground">
              No, your 30-day trial does not require a credit card. You can try
              any plan risk-free.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">
              Can I change plans later?
            </h3>
            <p className="text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes
              take effect immediately.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">
              What happens when my trial ends?
            </h3>
            <p className="text-muted-foreground">
              You&apos;ll be prompted to select a plan and enter payment details
              to continue using SoleLedger.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">
              Is there a discount for annual billing?
            </h3>
            <p className="text-muted-foreground">
              Yes, you can save up to 20% by choosing annual billing. Contact
              our support team to switch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
