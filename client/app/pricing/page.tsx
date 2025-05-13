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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
    console.log("handlePlanSelect", planType);
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
    <div className="mx-auto max-w-7xl p-5">
      <div className="mx-auto text-center max-w-3xl mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/80">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Choose the plan that fits your business needs, with a 30-day free
          trial - no credit card required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {/* Basic Plan */}
        <Card className="flex flex-col relative overflow-hidden hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl font-bold">
              {PLANS.BASIC.name}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {PLANS.BASIC.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-8">
              <span className="text-5xl font-bold tracking-tight">
                ${PLANS.BASIC.price}
              </span>
              <span className="text-muted-foreground ml-2 text-lg">/month</span>
            </div>
            <ul className="space-y-4">
              {PLANS.BASIC.features.map((feature, i) => (
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
              onClick={() => handlePlanSelect("BASIC")}
              disabled={isLoading.BASIC}
            >
              {isLoading.BASIC ? "Processing..." : "Start Free Trial"}
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
              {isLoading.PROFESSIONAL ? "Processing..." : "Start Free Trial"}
            </Button>
          </CardFooter>
        </Card>

        {/* Enterprise Plan */}
        <Card className="flex flex-col relative overflow-hidden hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl font-bold">
              {PLANS.ENTERPRISE.name}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {PLANS.ENTERPRISE.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-8">
              <span className="text-5xl font-bold tracking-tight">Custom</span>
            </div>
            <ul className="space-y-4">
              {PLANS.ENTERPRISE.features.map((feature, i) => (
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
              onClick={() => setShowEnterpriseForm(true)}
            >
              Contact Sales
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Enterprise Contact Form */}
      {showEnterpriseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md relative">
            <CardHeader>
              <CardTitle className="text-2xl">
                Request Enterprise Information
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Fill out this form and our team will contact you shortly.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEnterpriseRequest}>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input id="name" name="name" required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={session?.user?.email || ""}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company
                  </Label>
                  <Input
                    id="company"
                    name="company"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input id="phoneNumber" name="phoneNumber" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your business needs"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEnterpriseForm(false)}
                  className="flex-1 h-11 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading.ENTERPRISE}
                  className="flex-1 h-11 cursor-pointer"
                >
                  {isLoading.ENTERPRISE ? "Submitting..." : "Submit Request"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <div className="mt-32 text-center">
        <h2 className="text-3xl font-bold mb-12">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="credit-card">
              <AccordionTrigger className="text-xl font-semibold">
                Do I need a credit card to sign up?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                No, your 30-day trial does not require a credit card. You can
                try any plan risk-free.
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
                What happens when my trial ends?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                You&apos;ll be prompted to select a plan and enter payment
                details to continue using SoleLedger.
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
