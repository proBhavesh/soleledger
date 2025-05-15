"use client";

import { Card } from "@/components/ui/card";
import { Landmark } from "lucide-react";
import { PlaidLinkButton } from "@/components/dashboard/plaid-link-button";

interface ConnectAccountPromptProps {
  onSuccess: () => void;
}

export function ConnectAccountPrompt({ onSuccess }: ConnectAccountPromptProps) {
  return (
    <Card className="p-6 flex flex-col items-center text-center">
      <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-xl font-medium mb-2">Connect your bank account</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Connect your bank account to see real-time financial data and automate
        your bookkeeping process.
      </p>
      <PlaidLinkButton onSuccess={onSuccess} />
    </Card>
  );
}
