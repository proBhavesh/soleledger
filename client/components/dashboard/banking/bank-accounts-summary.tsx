"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlaidLinkButton } from "@/components/dashboard/plaid/plaid-link-button";
import { getBankAccounts, refreshBalances } from "@/lib/actions/plaid";
import { useBusinessContext } from "@/lib/contexts/business-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CircleDollarSign,
  LucideLoader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building,
  PiggyBank,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BankAccount } from "@/lib/types/dashboard";
import { BANK_ACCOUNT_TYPE_LABELS } from "@/lib/types/bank-accounts";

interface BankAccountsSummaryProps {
  accounts?: BankAccount[];
  onAccountSelect?: (accountId: string) => void;
  onRefresh?: () => void;
}

export function BankAccountsSummary({
  accounts: externalAccounts,
  onAccountSelect,
  onRefresh: externalRefresh,
}: BankAccountsSummaryProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingAccountId, setRefreshingAccountId] = useState<string | null>(
    null
  );
  const { selectedBusinessId } = useBusinessContext();

  // Use external accounts data if provided
  useEffect(() => {
    if (externalAccounts?.length) {
      setAccounts(externalAccounts);
      setIsLoading(false);
    }
  }, [externalAccounts]);

  // Fetch bank accounts if not provided externally
  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      // If we have external refresh handler, use it
      if (externalRefresh) {
        await externalRefresh();
        // We expect externalAccounts to be updated via the useEffect
      } else {
        // Legacy code path when component is used standalone
        const result = await getBankAccounts(selectedBusinessId || undefined);
        // Check if the result has the accounts property (is BankAccountsData)
        if (result && "accounts" in result && Array.isArray(result.accounts)) {
          setAccounts(result.accounts);
        } else {
          setAccounts([]);
        }
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      toast.error("Failed to load bank accounts");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [externalRefresh, selectedBusinessId]);

  // Refresh bank accounts
  const refreshAccounts = async () => {
    try {
      setIsRefreshing(true);
      // If we have external refresh handler, use it
      if (externalRefresh) {
        await externalRefresh();
      } else {
        await fetchAccounts();
      }
      toast.success("Bank accounts refreshed");
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh a specific account's balance
  const refreshAccountBalance = async (accountId: string) => {
    try {
      setRefreshingAccountId(accountId);
      const result = await refreshBalances(accountId);

      if (result.success) {
        // Update the account in the local state
        setAccounts((prevAccounts) =>
          prevAccounts.map((account) =>
            account.id === accountId
              ? {
                  ...account,
                  balance:
                    typeof result.balance === "number"
                      ? result.balance
                      : account.balance,
                  previousBalance: typeof account.balance === "number" ? account.balance : undefined, // Store previous balance for comparison
                  lastSync: new Date(),
                }
              : account
          )
        );
        toast.success("Balance updated successfully");
      } else {
        toast.error(result.error || "Failed to update balance");
      }
    } catch (error) {
      console.error("Error refreshing balance:", error);
      toast.error("Failed to update balance");
    } finally {
      setRefreshingAccountId(null);
    }
  };

  // Load accounts on mount if not provided externally
  useEffect(() => {
    if (!externalAccounts) {
      fetchAccounts();
    }
  }, [externalAccounts, fetchAccounts]);

  // Handle successful account connection
  const handleAccountConnected = () => {
    fetchAccounts();
  };

  // Handle account click - for selection or details
  const handleAccountClick = (accountId: string) => {
    if (onAccountSelect) {
      onAccountSelect(accountId);
    }
  };

  // Get account icon based on account type
  const getAccountIcon = (accountType: string | null | undefined) => {
    if (!accountType)
      return <Building className="h-5 w-5 text-muted-foreground" />;

    switch (accountType.toLowerCase()) {
      case "credit_card":
      case "credit card":
      case "credit":
        return <CreditCard className="h-5 w-5 text-sky-500" />;
      case "savings":
        return <PiggyBank className="h-5 w-5 text-emerald-500" />;
      case "line_of_credit":
      case "line of credit":
        return <CreditCard className="h-5 w-5 text-orange-500" />;
      case "loan":
        return <Building className="h-5 w-5 text-red-500" />;
      case "checking":
      default:
        return <Building className="h-5 w-5 text-blue-500" />;
    }
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
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
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
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800/50 rounded-t-lg">
        <div>
          <CardTitle className="text-xl font-semibold">Bank Accounts</CardTitle>
          <CardDescription className="text-muted-foreground">Your connected financial accounts</CardDescription>
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
          <span className="ml-2 hidden sm:inline">Refresh All</span>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 max-h-[400px] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {accounts.map((account) => {
            // Safe access to balance values with proper type checking
            const currentBalance =
              typeof account.balance === "number" ? account.balance : 0;
            const previousBalance =
              account.previousBalance !== undefined &&
              typeof account.previousBalance === "number"
                ? account.previousBalance
                : null;

            // Determine if balance has increased or decreased
            const hasBalanceIncreased =
              previousBalance !== null && currentBalance > previousBalance;
            const hasBalanceDecreased =
              previousBalance !== null && currentBalance < previousBalance;

            return (
              <div
                key={account.id}
                className="flex flex-col rounded-lg border-0 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md p-4 transition-all cursor-pointer group"
                onClick={() => handleAccountClick(account.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getAccountIcon(account.accountType)}
                    <div className="ml-3">
                      <h4 className="font-medium">{account.name}</h4>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>
                          {account.institution || "Financial Institution"}
                        </span>
                        {account.accountNumber && (
                          <>
                            <span className="mx-1">•</span>
                            <span>****{account.accountNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {account.isManual && (
                      <Badge variant="secondary" className="text-xs">
                        Manual
                      </Badge>
                    )}
                    {account.accountType && (
                      <Badge variant="outline">
                        {BANK_ACCOUNT_TYPE_LABELS[account.accountType as keyof typeof BANK_ACCOUNT_TYPE_LABELS] || account.accountType}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the row click
                        refreshAccountBalance(account.id);
                      }}
                      disabled={refreshingAccountId === account.id}
                      className="ml-2"
                    >
                      {refreshingAccountId === account.id ? (
                        <LucideLoader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatCurrency(currentBalance, account.currency)}
                  </div>

                  <div className="flex flex-col items-end">
                    {hasBalanceIncreased && (
                      <div className="flex items-center text-sm text-emerald-500">
                        <TrendingUp className="mr-1 h-4 w-4" />
                        <span>Balance increased</span>
                      </div>
                    )}
                    {hasBalanceDecreased && (
                      <div className="flex items-center text-sm text-red-500">
                        <TrendingDown className="mr-1 h-4 w-4" />
                        <span>Balance decreased</span>
                      </div>
                    )}
                    {(account.isManual ? account.lastManualUpdate : account.lastSync) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated: {formatDate(
                          account.isManual ? account.lastManualUpdate! : account.lastSync!
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Balance indicator (to help visualize the account size visually) */}
                <div className="mt-3">
                  <Progress
                    value={
                      currentBalance > 0
                        ? Math.min(100, currentBalance / 100)
                        : 0
                    }
                    className="h-1.5"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="border-t bg-gray-50/50 dark:bg-gray-900/50">
        <PlaidLinkButton
          variant="outline"
          className="w-full"
          onSuccess={handleAccountConnected}
        />
      </CardFooter>
    </Card>
  );
}
