"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LoaderCircle,
  RefreshCwIcon,
  ShoppingBag,
  CreditCard,
  Home,
  Coffee,
  Car,
  Utensils,
  Landmark,
} from "lucide-react";
import { PlaidLinkButton } from "@/components/dashboard/plaid/plaid-link-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BankAccount, Transaction } from "@/lib/types/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

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
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null
  );

  // Get category icon based on category name
  const getCategoryIcon = (category: string) => {
    const normalizedCategory = category.toLowerCase();

    if (
      normalizedCategory.includes("shopping") ||
      normalizedCategory.includes("merchandise")
    ) {
      return <ShoppingBag className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("food") ||
      normalizedCategory.includes("restaurant")
    ) {
      return <Utensils className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("home") ||
      normalizedCategory.includes("rent")
    ) {
      return <Home className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("travel") ||
      normalizedCategory.includes("transport")
    ) {
      return <Car className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("coffee") ||
      normalizedCategory.includes("cafe")
    ) {
      return <Coffee className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("payment") ||
      normalizedCategory.includes("transfer")
    ) {
      return <Landmark className="h-4 w-4" />;
    } else {
      return <CreditCard className="h-4 w-4" />;
    }
  };

  // Toggle transaction details
  const toggleTransactionDetails = (id: string) => {
    if (selectedTransaction === id) {
      setSelectedTransaction(null);
    } else {
      setSelectedTransaction(id);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800/50 rounded-t-lg">
        <div>
          <CardTitle className="text-xl font-semibold">Recent Transactions</CardTitle>
          <CardDescription className="text-muted-foreground">Your latest financial activity</CardDescription>
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
            {recentTransactions.map((transaction) => {
              const isExpanded = selectedTransaction === transaction.id;
              const isIncome = transaction.type === "INCOME";

              return (
                <div key={transaction.id} className="group rounded-lg border-0 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    onClick={() => toggleTransactionDetails(transaction.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isIncome 
                            ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30" 
                            : "bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30"
                        } shadow-sm group-hover:shadow-md transition-all`}
                      >
                        {isIncome ? (
                          <ArrowUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {transaction.merchantName || transaction.description}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span>{formatDate(transaction.date)}</span>
                          {transaction.accountName && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{transaction.accountName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`font-bold text-lg ${
                          isIncome 
                            ? "bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent" 
                            : "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                      <div className="flex items-center mt-1">
                        {transaction.category && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                >
                                  {getCategoryIcon(transaction.category)}
                                  <span>{transaction.category}</span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {transaction.categoryConfidence
                                  ? `${Math.round(
                                      transaction.categoryConfidence * 100
                                    )}% confidence`
                                  : "Category"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && transaction.originalDescription && (
                    <div className="px-4 pb-4 pt-0 border-t mt-1">
                      <div className="text-sm pt-3">
                        <div className="grid grid-cols-2 gap-4">
                          {transaction.originalDescription && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Original Description
                              </div>
                              <div className="text-sm">
                                {transaction.originalDescription}
                              </div>
                            </div>
                          )}
                          {transaction.locationCity && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Location
                              </div>
                              <div className="text-sm">
                                {transaction.locationCity}
                                {transaction.locationRegion &&
                                  `, ${transaction.locationRegion}`}
                              </div>
                            </div>
                          )}
                          {transaction.subcategory && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                Subcategory
                              </div>
                              <div className="text-sm">
                                {transaction.subcategory}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
