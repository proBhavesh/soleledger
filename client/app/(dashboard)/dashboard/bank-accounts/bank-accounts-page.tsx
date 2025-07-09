"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankAccountsSummary } from "@/components/dashboard/banking/bank-accounts-summary";
import { BankAccountDetail } from "@/components/dashboard/banking/bank-accounts-detail";
import { AccountBalanceChart } from "@/components/dashboard/charts/account-balance-chart";
import { TransactionCategoryDialog } from "@/components/dashboard/transactions/transaction-category-dialog";
import { TransactionFilters } from "@/components/dashboard/transactions/transaction-filters";
import { PlaidLinkButton } from "@/components/dashboard/plaid/plaid-link-button";
import { CreateManualAccountDialog } from "@/components/dashboard/banking/create-manual-account-dialog";
import { getBankAccounts, getEnrichedTransactions } from "@/lib/actions/plaid";
import { toast } from "sonner";
import {
  AlertCircle,
  Building,
  ChevronLeft,
  RefreshCw,
  Tag,
  Plus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction, BankAccount } from "@/lib/types/dashboard";

interface BankAccountsPageProps {
  initialAccounts: BankAccount[];
  error: string | null;
}

export function BankAccountsPage({
  initialAccounts,
  error,
}: BankAccountsPageProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showManualAccountDialog, setShowManualAccountDialog] = useState(false);

  // Get selected account
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  // Load recent transactions for the activity tab
  useEffect(() => {
    if (activeTab === "activity" && !selectedAccountId) {
      fetchRecentTransactions();
      // Fetch unique categories from transactions
      const uniqueCategories = Array.from(
        new Set(recentTransactions.map((t) => t.category))
      ).filter(Boolean) as string[];
      setCategories(uniqueCategories);
    }
  }, [activeTab, selectedAccountId, recentTransactions]);

  // Fetch recent transactions across all accounts
  const fetchRecentTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const result = await getEnrichedTransactions(20, 0);
      if (result.success && result.transactions) {
        setRecentTransactions(result.transactions);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(result.transactions.map((t) => t.category))
        ).filter(Boolean) as string[];
        setCategories(uniqueCategories);
      } else {
        toast.error(result.error || "Failed to load transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load recent transactions");
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Refresh all accounts data
  const refreshAllAccounts = async () => {
    try {
      setIsRefreshing(true);
      const result = await getBankAccounts();

      if (result && "accounts" in result && Array.isArray(result.accounts)) {
        setAccounts(result.accounts);
        toast.success("Accounts refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      toast.error("Failed to refresh accounts");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle successful account connection
  const handleAccountConnected = () => {
    refreshAllAccounts();
    toast.success("Bank account connected successfully!");
  };

  // Handle account selection
  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  // Handle back to accounts list
  const handleBackToAccounts = () => {
    setSelectedAccountId(null);
  };

  // Handle transaction category update
  const handleCategoryChange = async (
    transactionId: string,
    categoryId: string
  ) => {
    // This would typically call an API endpoint to update the category
    // For now, we'll just mock it for demonstration
    try {
      // In a real implementation we'd use the categoryId parameter to get category details
      console.log(
        `Updating transaction ${transactionId} to category ${categoryId}`
      );

      // Mock API call - would normally use categoryId to look up category details
      // await updateTransactionCategory(transactionId, categoryId);

      // Update local state - using a placeholder instead of looking up the category name
      setRecentTransactions((prev) =>
        prev.map((t) => {
          if (t.id === transactionId) {
            // In a real implementation, we would look up the category name by its ID
            return { ...t, category: "Updated Category" };
          }
          return t;
        })
      );

      return true;
    } catch (error) {
      console.error("Error updating category:", error);
      return false;
    }
  };

  // Handle filter changes
  const handleFiltersChange = () => {
    // In a real implementation, we would use the filters to fetch filtered data
    // For now, we just refresh all transactions
    fetchRecentTransactions();
  };

  // Render "coming soon" message for features that are not yet implemented
  const renderComingSoon = (
    title: string,
    description: string,
    icon: React.ReactNode
  ) => (
    <div className="rounded-lg border p-8 flex flex-col items-center justify-center text-center">
      {icon}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{description}</p>
      <p className="text-sm text-muted-foreground">
        Coming soon! This feature is currently in development.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {selectedAccount ? (
              <Button
                variant="ghost"
                className="p-0 mr-2"
                onClick={handleBackToAccounts}
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </Button>
            ) : null}
            {selectedAccount ? selectedAccount.name : "Bank Accounts"}
          </h1>
          <p className="text-muted-foreground">
            {selectedAccount
              ? `View details and activity for ${selectedAccount.name}`
              : "Manage your connected financial accounts and view balances"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectedAccount && (
            <>
              <Button
                variant="outline"
                onClick={refreshAllAccounts}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh All
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualAccountDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Manual Account
              </Button>
              <PlaidLinkButton onSuccess={handleAccountConnected} />
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedAccount ? (
        // Detailed view of a specific account
        <div className="space-y-6">
          <BankAccountDetail
            account={selectedAccount}
            onRefresh={refreshAllAccounts}
          />
          <AccountBalanceChart
            accountId={selectedAccount.id}
            accountName={selectedAccount.name}
            currentBalance={selectedAccount.balance || 0}
            currency={selectedAccount.currency}
          />
        </div>
      ) : (
        // Overview of all accounts with tabs
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger
              value="overview"
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              onClick={() => setActiveTab("activity")}
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <BankAccountsSummary
              onAccountSelect={handleSelectAccount}
              accounts={accounts}
              onRefresh={refreshAllAccounts}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">Recent Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    Recent transactions across all your accounts
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRecentTransactions}
                  disabled={isLoadingTransactions}
                >
                  {isLoadingTransactions ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>

              <div className="mb-6">
                <TransactionFilters
                  categories={categories}
                  accounts={accounts.map((acc) => ({
                    id: acc.id,
                    name: acc.name,
                  }))}
                  onFiltersChange={handleFiltersChange}
                />
              </div>

              {isLoadingTransactions ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="flex justify-between p-2 border-b"
                      >
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    No recent transactions found.
                  </p>
                  <Button variant="outline" onClick={fetchRecentTransactions}>
                    Refresh Transactions
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>
                          {transaction.merchantName || transaction.description}
                        </TableCell>
                        <TableCell>
                          {transaction.accountName || "Unknown"}
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            transaction.type === "INCOME"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "INCOME" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <TransactionCategoryDialog
                            currentCategory={transaction.category}
                            onCategoryChange={(categoryId) =>
                              handleCategoryChange(transaction.id, categoryId)
                            }
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Tag className="h-4 w-4 mr-2" />
                                Categorize
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            {renderComingSoon(
              "Account Settings",
              "Manage your bank connections, update preferences, and adjust sync settings for your accounts.",
              <Building className="h-10 w-10 text-muted-foreground mb-3" />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Manual Account Creation Dialog */}
      <CreateManualAccountDialog
        open={showManualAccountDialog}
        onOpenChange={setShowManualAccountDialog}
        onSuccess={refreshAllAccounts}
      />
    </div>
  );
}
