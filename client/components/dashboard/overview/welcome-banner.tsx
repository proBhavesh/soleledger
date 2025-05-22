"use client";

import { useState } from "react";
import { CheckCircle2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type WelcomeBannerProps = {
  userName: string;
  subscriptionType?: "trial" | "success";
};

export default function WelcomeBanner({
  userName,
  subscriptionType = "trial",
}: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const getMessage = () => {
    if (subscriptionType === "trial") {
      return (
        <>
          <CheckCircle2Icon className="h-5 w-5 text-emerald-500 mr-2" />
          <span className="font-medium">
            Welcome to SoleLedger, {userName}! Your 30-day trial has begun.
          </span>
        </>
      );
    }

    return (
      <>
        <CheckCircle2Icon className="h-5 w-5 text-emerald-500 mr-2" />
        <span className="font-medium">
          Welcome to SoleLedger, {userName}! Your subscription is now active.
        </span>
      </>
    );
  };

  return (
    <div className="relative bg-muted rounded-md p-4 mb-6">
      <div className="flex items-center">
        {getMessage()}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2"
          onClick={() => setIsVisible(false)}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      <p className="text-sm mt-1 ml-7 text-muted-foreground">
        {subscriptionType === "trial"
          ? "Explore all features during your trial. Need help getting started? Check out our guides."
          : "Thank you for subscribing. You now have full access to all features."}
      </p>
    </div>
  );
}
