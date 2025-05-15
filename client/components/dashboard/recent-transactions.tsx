"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon, LoaderCircle, RefreshCwIcon } from "lucide-react";
import { PlaidLinkButton } from "@/components/dashboard/plaid-link-button";
import { formatCurrency } from "@/lib/utils";
import { BankAccount, Transaction } from "@/lib/types/dashboard";

interface RecentTransactionsProps {
  isLoading: boolean;
  hasConnectedAccounts: boolean;
  recentTransactions: Transaction[];
  bankAccounts: BankAccount[];
  isRefreshing: boolean;
  onAccountConnected: () => void;
  onRefresh: (bankAccountId: string) => Promise<void>;
}

export function RecentTransactions({
  isLoading,
  hasConnectedAccounts,
  recentTransactions,
  bankAccounts,
  isRefreshing,
  onAccountConnected,
  onRefresh,
}: RecentTransactionsProps) {
  // Format transaction date
  const formatTransactionDate = (dateString: string | Date) => {
    if (!dateString) return "";
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => bankAccounts?.[0]?.id && onRefresh(bankAccounts[0].id)}
          disabled={isRefreshing || !bankAccounts.length}
        >
          {isRefreshing ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCwIcon className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasConnectedAccounts ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">
              Connect your bank account to see your recent transactions
            </p>
            <PlaidLinkButton onSuccess={onAccountConnected} />
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">
              No recent transactions found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-md border">
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-center">
                    <FileTextIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {transaction.description}
                    </span>
                    <span
                      className={`ml-auto font-medium ${
                        transaction.type === "INCOME"
                          ? "text-emerald-500"
                          : "text-red-500"
                      }`}
                    >
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>{transaction.category}</span>
                    <span className="mx-2">•</span>
                    <span>{formatTransactionDate(transaction.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
