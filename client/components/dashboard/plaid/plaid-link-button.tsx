"use client";

import { useState, useCallback } from "react";
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { LucideLoader2, CircleDollarSign, RefreshCw, Lock } from "lucide-react";
import { createLinkToken, exchangePublicToken } from "@/lib/actions/plaid";
import { useBusinessContext } from "@/lib/contexts/business-context";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface PlaidLinkButtonProps {
  className?: string;
  onSuccess?: () => void;
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function PlaidLinkButton({
  className,
  onSuccess,
  variant = "default",
  size = "default",
}: PlaidLinkButtonProps) {
  const { permissions, isAccountant, selectedBusinessId } = useBusinessContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showSyncingDialog, setShowSyncingDialog] = useState(false);
  const [shouldOpenLink, setShouldOpenLink] = useState(false);
  const [hasJustConnected, setHasJustConnected] = useState(false);

  // Check if user has permission to manage financial accounts
  const canManageAccounts = permissions.canManageFinancials;

  // Function to fetch a link token when button is clicked
  const getPlaidLinkToken = useCallback(async () => {
    // Check permissions before proceeding
    if (!canManageAccounts) {
      toast.error("You don't have permission to connect bank accounts");
      return;
    }

    setIsLoading(true);
    setShouldOpenLink(true);
    try {
      const response = await createLinkToken(selectedBusinessId || undefined);
      setToken(response.linkToken);
      setBusinessId(response.businessId);
    } catch (error) {
      console.error("Error getting link token:", error);
      toast.error("Failed to start bank connection process");
      setShouldOpenLink(false);
    } finally {
      setIsLoading(false);
    }
  }, [canManageAccounts, selectedBusinessId]);

  // Handle success from Plaid Link
  const handleSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setIsLoading(true);
      try {
        if (!businessId) {
          throw new Error("Business ID not found");
        }

        // Transform metadata to match the expected format
        const transformedMetadata = {
          institution: metadata.institution
            ? {
                name: metadata.institution.name,
                id: metadata.institution.institution_id,
              }
            : undefined,
          accounts: metadata.accounts.map((account) => ({
            id: account.id,
            name: account.name,
            mask: account.mask,
            type: account.type,
            subtype: account.subtype,
          })),
        };

        // First, exchange the public token
        await exchangePublicToken(publicToken, businessId, transformedMetadata);

        // Now show the syncing dialog after the Plaid modal is closed and token is exchanged
        setIsSyncing(true);
        setShowSyncingDialog(true);
        setSyncProgress(10);

        // Set progress as we sync transactions
        setSyncProgress(50);

        // Simulate progress while transaction syncing happens in the background
        const progressInterval = setInterval(() => {
          setSyncProgress((prevProgress) => {
            if (prevProgress >= 95) {
              clearInterval(progressInterval);
              return 100;
            }
            return prevProgress + 5;
          });
        }, 500);

        // Give a few seconds to show the syncing dialog
        setTimeout(() => {
          clearInterval(progressInterval);
          setSyncProgress(100);

          // Show success message
          toast.success(
            "Bank account connected successfully! We'll now automatically categorize your transactions and identify recurring payments."
          );

          // Close the dialog and call onSuccess after completion
          setTimeout(() => {
            setIsSyncing(false);
            setShowSyncingDialog(false);

            if (onSuccess) {
              onSuccess();
            }
          }, 1000);
        }, 5000);
      } catch (error) {
        console.error("Error exchanging public token:", error);
        toast.error("Failed to connect bank account");
        setIsSyncing(false);
        setShowSyncingDialog(false);
      } finally {
        setIsLoading(false);
        // Reset token to null and prevent re-opening
        setToken(null);
        setShouldOpenLink(false);
        setHasJustConnected(true);
        // Reset the flag after a short delay
        setTimeout(() => {
          setHasJustConnected(false);
        }, 1000);
      }
    },
    [businessId, onSuccess]
  );

  // Configure Plaid Link
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (public_token, metadata) => {
      handleSuccess(public_token, metadata);
    },
    onExit: () => {
      setToken(null);
      setIsLoading(false);
      setShouldOpenLink(false);
    },
  });

  // When token is fetched, open Plaid Link
  if (token && ready && shouldOpenLink && !hasJustConnected) {
    open();
    setShouldOpenLink(false);
  }

  return (
    <>
      <Button
        className={className}
        onClick={canManageAccounts ? getPlaidLinkToken : () => {
          toast.error(`${isAccountant ? 'You need financial management access' : 'Insufficient permissions'} to connect bank accounts`);
        }}
        disabled={isLoading || isSyncing || !canManageAccounts}
        variant={!canManageAccounts ? "outline" : variant}
        size={size}
        title={!canManageAccounts ? "You don't have permission to connect bank accounts" : undefined}
      >
        {isLoading ? (
          <>
            <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : !canManageAccounts ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            {isAccountant ? "Connect Client Account" : "Connect Bank Account"}
          </>
        ) : (
          <>
            <CircleDollarSign className="mr-2 h-4 w-4" />
            {isAccountant ? "Connect Client Account" : "Connect Bank Account"}
          </>
        )}
      </Button>

      <Dialog open={showSyncingDialog} onOpenChange={setShowSyncingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Syncing Bank Account</DialogTitle>
            <DialogDescription>
              We&apos;re connecting to your bank and importing your
              transactions. This may take a few moments.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            </div>
            <Progress value={syncProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {syncProgress < 50
                ? "Establishing connection..."
                : syncProgress < 90
                ? "Importing and categorizing transactions..."
                : "Almost done..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
