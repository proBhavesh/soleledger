"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, Users, Mail } from "lucide-react";
import { PlaidLinkButton } from "@/components/dashboard/plaid/plaid-link-button";
import { useBusinessContext } from "@/lib/contexts/business-context";

interface ConnectAccountPromptProps {
  onSuccess: () => void;
}

export function ConnectAccountPrompt({ onSuccess }: ConnectAccountPromptProps) {
  const { permissions, isAccountant, selectedBusiness } = useBusinessContext();

  // Different content based on user role and permissions
  if (isAccountant && !permissions.canManageFinancials) {
    return (
      <Card className="p-6 flex flex-col items-center text-center">
        <Users className="h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-xl font-medium mb-2">Client needs to connect their bank accounts</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Only the business owner can connect bank accounts. Ask your client to log in and connect their accounts, 
          or request financial management access from them.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {
            // TODO: Implement client invitation feature
            console.log("Send setup reminder to client");
          }}>
            <Mail className="w-4 h-4 mr-2" />
            Send Setup Reminder
          </Button>
          <PlaidLinkButton onSuccess={onSuccess} variant="outline" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col items-center text-center">
      <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-xl font-medium mb-2">
        {isAccountant ? "Connect client's bank accounts" : "Connect your bank account"}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        {isAccountant 
          ? `Connect ${selectedBusiness?.name || "your client's"} bank accounts to see real-time financial data and automate bookkeeping. You'll need their bank credentials to proceed.`
          : "Connect your bank account to see real-time financial data and automate your bookkeeping process."
        }
      </p>
      <PlaidLinkButton onSuccess={onSuccess} />
    </Card>
  );
}
