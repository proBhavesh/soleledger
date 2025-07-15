"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChartOfAccountsProgressDialog } from "./chart-of-accounts-progress-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { createChartOfAccountsForBusiness } from "@/lib/actions/chart-of-accounts-setup-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ChartOfAccountsSetupProps } from "@/lib/types/chart-of-accounts";

/**
 * Component for setting up Chart of Accounts for a business.
 * Can be displayed as a card or inline content.
 * Shows a progress dialog during account creation.
 * 
 * @param {ChartOfAccountsSetupProps} props - Component props
 * @param {string} props.businessId - The ID of the business to set up accounts for
 * @param {Function} props.onComplete - Callback fired when setup is complete
 * @param {boolean} props.showAsCard - Whether to wrap content in a card (default: true)
 */
export function ChartOfAccountsSetup({
  businessId,
  onComplete,
  showAsCard = true,
}: ChartOfAccountsSetupProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const router = useRouter();

  const handleSetupChartOfAccounts = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isCreating) return;
    
    setIsCreating(true);
    setShowProgress(true);

    try {
      const result = await createChartOfAccountsForBusiness(businessId);
      
      if (result.success) {
        toast.success("Chart of Accounts created successfully!");
        onComplete?.();
        router.refresh();
      } else {
        // More specific error messages
        const errorMessage = result.error || "Failed to create Chart of Accounts";
        toast.error(errorMessage);
        setShowProgress(false);
      }
    } catch (error) {
      console.error("Error creating Chart of Accounts:", error);
      
      // User-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : "An unexpected error occurred while creating Chart of Accounts";
      
      toast.error(errorMessage);
      setShowProgress(false);
    } finally {
      setIsCreating(false);
    }
  }, [businessId, isCreating, onComplete, router]);

  const handleProgressComplete = useCallback(() => {
    setShowProgress(false);
  }, []);

  const content = (
    <>
      <div className="flex items-center gap-2 text-amber-600 mb-4">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Chart of Accounts not set up</p>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Your business needs a Chart of Accounts to properly categorize transactions 
        and generate financial reports. This will create standard accounting categories 
        for your business.
      </p>
      <Button 
        onClick={handleSetupChartOfAccounts} 
        disabled={isCreating}
        className="w-full"
      >
        {isCreating ? "Setting up..." : "Set Up Chart of Accounts"}
      </Button>
    </>
  );

  if (!showAsCard) {
    return (
      <>
        {content}
        <ChartOfAccountsProgressDialog
          open={showProgress}
          onComplete={handleProgressComplete}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts Required</CardTitle>
          <CardDescription>
            Set up your accounting structure to start importing transactions
          </CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
      <ChartOfAccountsProgressDialog
        open={showProgress}
        onComplete={handleProgressComplete}
      />
    </>
  );
}