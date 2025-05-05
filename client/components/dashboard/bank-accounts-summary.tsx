"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlaidLinkButton } from "@/components/dashboard/plaid-link-button";
import { getBankAccounts } from "@/lib/actions/plaid-actions";
import { formatCurrency } from "@/lib/utils";
import { CircleDollarSign, LucideLoader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  name: string;
  institution?: string | null;
  balance?: number | null;
  currency: string;
  lastSync?: Date | null;
}

interface BankAccountsData {
  accounts: BankAccount[];
  businessId: string;
}

export function BankAccountsSummary() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch bank accounts
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const result = await getBankAccounts();
      // Check if the result has the accounts property (is BankAccountsData)
      if (result && "accounts" in result && Array.isArray(result.accounts)) {
        setAccounts(result.accounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      toast.error("Failed to load bank accounts");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh bank accounts
  const refreshAccounts = async () => {
    try {
      setIsRefreshing(true);
      await fetchAccounts();
      toast.success("Bank accounts refreshed");
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle successful account connection
  const handleAccountConnected = () => {
    fetchAccounts();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Connect and manage your bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex flex-col items-center gap-2">
            <LucideLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Connect your bank accounts to automatically import transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <CircleDollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No bank accounts connected</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Connect your bank accounts to automatically import transactions and
            keep your books up to date.
          </p>
          <div className="mt-6">
            <PlaidLinkButton onSuccess={handleAccountConnected} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>Your connected financial accounts</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAccounts}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <LucideLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-1">
                <h4 className="font-medium">{account.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {account.institution || "Financial Institution"}
                </p>
                {account.lastSync && (
                  <p className="text-xs text-muted-foreground">
                    Last updated:{" "}
                    {new Date(account.lastSync).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(account.balance || 0, account.currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <PlaidLinkButton
          variant="outline"
          className="w-full"
          onSuccess={handleAccountConnected}
        />
      </CardFooter>
    </Card>
  );
}
