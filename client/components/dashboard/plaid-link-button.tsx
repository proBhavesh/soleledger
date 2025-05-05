"use client";

import { useState, useCallback } from "react";
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { LucideLoader2, CircleDollarSign } from "lucide-react";
import {
  createLinkToken,
  exchangePublicToken,
} from "@/lib/actions/plaid-actions";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Function to fetch a link token when button is clicked
  const getPlaidLinkToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await createLinkToken();
      setToken(response.linkToken);
      setBusinessId(response.businessId);
    } catch (error) {
      console.error("Error getting link token:", error);
      toast.error("Failed to start bank connection process");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

        await exchangePublicToken(publicToken, businessId, transformedMetadata);
        toast.success("Bank account connected successfully!");

        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error("Error exchanging public token:", error);
        toast.error("Failed to connect bank account");
      } finally {
        setIsLoading(false);
        // Reset token to null
        setToken(null);
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
    },
  });

  // When token is fetched, open Plaid Link
  if (token && ready) {
    open();
  }

  return (
    <Button
      className={className}
      onClick={getPlaidLinkToken}
      disabled={isLoading}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <CircleDollarSign className="mr-2 h-4 w-4" />
          Connect Bank Account
        </>
      )}
    </Button>
  );
}
