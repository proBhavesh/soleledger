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
import { useSession } from "next-auth/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  startTrialAction,
  createCheckoutSessionAction,
} from "@/lib/actions/subscription-actions";
import { PLANS } from "@/lib/stripe/client";
import { toast } from "sonner";

export default function PricingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const handlePlanSelect = async (planType: "FREE" | "PROFESSIONAL" | "BUSINESS") => {
    console.log("handlePlanSelect", planType);
    if (status !== "authenticated") {
      // Redirect to login if not authenticated
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }

    setIsLoading({ ...isLoading, [planType]: true });

    try {
      if (planType === "FREE") {
        // For free plan, create subscription directly
        const result = await startTrialAction(planType);

        if (result.error) {
          toast.error(result.error);
        } else if (result.success) {
          toast.success(result.message);
          if (result.redirect) {
            router.push(result.redirect);
          } else {
            router.push("/dashboard");
          }
        }
      } else {
        // For paid plans, go to Stripe checkout
        const checkoutResult = await createCheckoutSessionAction(planType);

        if (checkoutResult.error) {
          toast.error(checkoutResult.error);
        } else if (checkoutResult.checkoutUrl) {
          // Redirect to Stripe checkout
          window.location.href = checkoutResult.checkoutUrl;
        } else {
          toast.error("Unable to create checkout session. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error selecting plan:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading({ ...isLoading, [planType]: false });
    }
  };


  return (
    <div className="mx-auto max-w-7xl p-5">
      <div className="mx-auto text-center max-w-3xl mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/80">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Start free and upgrade as you grow. No credit card required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {/* Free Plan */}
        <Card className="flex flex-col relative overflow-hidden hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl font-bold">
              {PLANS.FREE.name}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {PLANS.FREE.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-8">
              <span className="text-5xl font-bold tracking-tight">
                ${PLANS.FREE.price}
              </span>
              <span className="text-muted-foreground ml-2 text-lg">/month</span>
            </div>
            <ul className="space-y-4">
              {PLANS.FREE.features.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckIcon className="mr-3 h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-6">
            <Button
              type="button"
              className="w-full h-12 text-base cursor-pointer hover:scale-[1.02] transition-transform duration-200"
              onClick={() => handlePlanSelect("FREE")}
              disabled={isLoading.FREE}
            >
              {isLoading.FREE ? "Processing..." : "Get Started Free"}
            </Button>
          </CardFooter>
        </Card>

        {/* Professional Plan */}
        <Card className="flex flex-col relative overflow-hidden hover:shadow-2xl transition-all duration-300 group border-primary/50">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
          <CardHeader className="pb-8 relative">
            <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wide w-fit mx-auto mb-4 shadow-sm">
              Most Popular
            </div>
            <CardTitle className="text-2xl font-bold">
              {PLANS.PROFESSIONAL.name}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {PLANS.PROFESSIONAL.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-8">
              <span className="text-5xl font-bold tracking-tight">
                ${PLANS.PROFESSIONAL.price}
              </span>
              <span className="text-muted-foreground ml-2 text-lg">/month</span>
            </div>
            <ul className="space-y-4">
              {PLANS.PROFESSIONAL.features.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckIcon className="mr-3 h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-6">
            <Button
              type="button"
              className="w-full h-12 text-base cursor-pointer hover:scale-[1.02] transition-transform duration-200"
              variant="default"
              onClick={() => handlePlanSelect("PROFESSIONAL")}
              disabled={isLoading.PROFESSIONAL}
            >
              {isLoading.PROFESSIONAL ? "Processing..." : "Get Started"}
            </Button>
          </CardFooter>
        </Card>

        {/* Business Plan */}
        <Card className="flex flex-col relative overflow-hidden hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl font-bold">
              {PLANS.BUSINESS.name}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {PLANS.BUSINESS.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-8">
              <span className="text-5xl font-bold tracking-tight">
                ${PLANS.BUSINESS.price}
              </span>
              <span className="text-muted-foreground ml-2 text-lg">/month</span>
            </div>
            <ul className="space-y-4">
              {PLANS.BUSINESS.features.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckIcon className="mr-3 h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-6">
            <Button
              type="button"
              className="w-full h-12 text-base cursor-pointer hover:scale-[1.02] transition-transform duration-200"
              variant="outline"
              onClick={() => handlePlanSelect("BUSINESS")}
              disabled={isLoading.BUSINESS}
            >
              {isLoading.BUSINESS ? "Processing..." : "Get Started"}
            </Button>
          </CardFooter>
        </Card>
      </div>


      <div className="mt-32 text-center">
        <h2 className="text-3xl font-bold mb-12">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="credit-card">
              <AccordionTrigger className="text-xl font-semibold">
                Do I need a credit card to sign up?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                No, you can start with our free plan without a credit card. You&apos;ll only need a card when upgrading to a paid plan.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="change-plans">
              <AccordionTrigger className="text-xl font-semibold">
                Can I change plans later?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                take effect immediately.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="trial-end">
              <AccordionTrigger className="text-xl font-semibold">
                What happens when I reach my plan limits?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                You&apos;ll be notified when approaching your limits. You can upgrade anytime to continue adding transactions, bank accounts, or documents.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="annual-billing">
              <AccordionTrigger className="text-xl font-semibold">
                Is there a discount for annual billing?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Yes, you can save up to 20% by choosing annual billing. Contact
                our support team to switch.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
