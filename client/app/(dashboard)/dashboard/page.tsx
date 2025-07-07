"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBusinessContext } from "@/lib/contexts/business-context";
// Removed unused Card imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoaderCircle, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankAccountsSummary } from "@/components/dashboard/banking/bank-accounts-summary";
import { RecurringTransactions } from "@/components/dashboard/transactions/recurring-transactions";
import { getFinancialSummary, refreshTransactions, getMonthlyCashFlow, type MonthlyFlow } from "@/lib/actions/plaid";
import { toast } from "sonner";
import { FinancialMetrics } from "@/components/dashboard/overview/financial-metrics";
import { CashFlowChart } from "@/components/dashboard/charts/cash-flow-chart";
import { IncomeExpenseChart } from "@/components/dashboard/charts/income-expense-chart";
import { AccountBalanceCards } from "@/components/dashboard/banking/account-balance-cards";
import { ConnectAccountPrompt } from "@/components/dashboard/banking/connect-account-prompt";
import { RecentTransactions } from "@/components/dashboard/transactions/recent-transactions";
import { PendingDocuments } from "@/components/dashboard/overview/pending-documents";
import { ClientOverview } from "@/components/dashboard/overview/client-overview";
import { Client, FinancialSummary } from "@/lib/types/dashboard";
import { UsageTracker } from "@/components/dashboard/settings/usage-tracker";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedBusinessId, isLoading: isBusinessLoading, availableBusinesses, isAccountant } = useBusinessContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    pendingReceipts: 0,
    totalBalance: 0,
    recentTransactions: [],
    hasConnectedAccounts: false,
    recurringExpenses: [],
    bankAccounts: [],
  });
  const [cashFlowData, setCashFlowData] = useState<MonthlyFlow[]>([]);

  const userRole = session?.user?.role || "BUSINESS_OWNER";
  const userName = session?.user?.name || "User";

  // Check if the user just completed the subscription flow
  const subscriptionStatus = searchParams?.get("subscription") as
    | string
    | undefined;
  const showWelcomeBanner = !!subscriptionStatus;

  // Mock data for clients (for accountant view)
  const mockClients: Client[] = [
    {
      name: "Acme Inc.",
      status: "Complete",
      lastUpdated: "Oct 12, 2023",
      pendingTransactions: 11,
    },
    {
      name: "Widget Co.",
      status: "Needs Review",
      lastUpdated: "Oct 10, 2023",
      pendingTransactions: 8,
    },
    {
      name: "Globex Corp",
      status: "Attention Needed",
      lastUpdated: "Oct 8, 2023",
      pendingTransactions: 24,
    },
  ];

  useEffect(() => {
    // Don't fetch data until we have a selected business or if business context is still loading
    if (isBusinessLoading || !selectedBusinessId) {
      return;
    }

    const fetchFinancialData = async () => {
      setIsLoading(true);
      try {
        const [data, cashFlow] = await Promise.all([
          getFinancialSummary(selectedBusinessId || undefined),
          getMonthlyCashFlow(selectedBusinessId || undefined)
        ]);

        // Transform the recurring expenses to match the expected type
        const fixedData = {
          ...data,
          recurringExpenses: data.recurringExpenses.map((expense) => ({
            ...expense,
            flow: expense.amount > 0 ? "OUTFLOW" : "INFLOW", // Add the missing 'flow' property
          })),
        };

        setFinancialData(fixedData as FinancialSummary);
        setCashFlowData(cashFlow);
      } catch (error) {
        console.error("Error fetching financial data:", error);
        toast.error("Failed to load financial data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinancialData();
  }, [selectedBusinessId, isBusinessLoading]);

  // Helper function to refetch data
  const refetchData = useCallback(async () => {
    if (!selectedBusinessId) return;
    
    setIsLoading(true);
    try {
      const [data, cashFlow] = await Promise.all([
        getFinancialSummary(selectedBusinessId),
        getMonthlyCashFlow(selectedBusinessId)
      ]);

      // Transform the recurring expenses to match the expected type
      const fixedData = {
        ...data,
        recurringExpenses: data.recurringExpenses.map((expense) => ({
          ...expense,
          flow: expense.amount > 0 ? "OUTFLOW" : "INFLOW",
        })),
      };

      setFinancialData(fixedData as FinancialSummary);
      setCashFlowData(cashFlow);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Failed to load financial data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusinessId]);

  // Handle successful Plaid account connection
  const handleAccountConnected = () => {
    refetchData();
  };

  // Handle refreshing transaction data
  const handleRefreshTransactions = async (bankAccountId: string) => {
    setIsRefreshing(true);
    try {
      const result = await refreshTransactions(bankAccountId);
      if (result.success) {
        toast.success(result.message || "Transactions refreshed successfully");
        refetchData();
      } else {
        toast.error(result.error || "Failed to refresh transactions");
      }
    } catch (error) {
      console.error("Error refreshing transactions:", error);
      toast.error("Failed to refresh transactions");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading state when business context is loading or no business is selected
  if (isBusinessLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          <span>Loading business...</span>
        </div>
      </div>
    );
  }

  // Show appropriate message for accountants based on their state
  if (isAccountant && !isBusinessLoading) {
    if (availableBusinesses.length === 0) {
      // No clients at all - show add client prompt
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to SoleLedger!</h2>
              <p className="text-muted-foreground">
                As an accountant, you can manage multiple client businesses. 
                Start by adding your first client to begin managing their financial data.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/clients')}
              size="lg"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Client
            </Button>
          </div>
        </div>
      );
    } else if (!selectedBusinessId) {
      // Has clients but none selected - show selection prompt
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-xl font-semibold mb-2">Select a Client</div>
            <p className="text-muted-foreground mb-4">
              Please select a client business from the dropdown above to view their dashboard.
            </p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/clients')}
            >
              View All Clients
            </Button>
          </div>
        </div>
      );
    }
  }

  // Handle case where business owner has no business (edge case)
  if (!isAccountant && !isBusinessLoading && !selectedBusinessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">No Business Found</div>
          <p className="text-muted-foreground">
            Unable to find your business. Please contact support if this issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Enhanced welcome header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 shadow-xl">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-lg text-white/80">
            Here&apos;s your financial overview for today
          </p>
        </div>
        {showWelcomeBanner && (
          <div className="mt-4 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 p-4">
            <p className="text-sm text-white font-medium">
              🎉 Subscription activated successfully! You now have access to all
              features.
            </p>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full ${userRole === "ACCOUNTANT" ? "grid-cols-4" : "grid-cols-3"} bg-muted/50 p-1 rounded-lg`}>
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Overview</TabsTrigger>
          <TabsTrigger value="accounts" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Accounts</TabsTrigger>
          <TabsTrigger value="recent" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Recent Activity</TabsTrigger>
          {userRole === "ACCOUNTANT" && (
            <TabsTrigger value="clients" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Clients</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !financialData.hasConnectedAccounts ? (
            <ConnectAccountPrompt onSuccess={handleAccountConnected} />
          ) : (
            <>
              <FinancialMetrics data={financialData} />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <CashFlowChart
                  bankAccounts={financialData.bankAccounts}
                  isRefreshing={isRefreshing}
                  onRefresh={handleRefreshTransactions}
                  className="col-span-4"
                  monthlyData={cashFlowData}
                />
                <div className="col-span-3">
                  <BankAccountsSummary 
                    accounts={financialData.bankAccounts}
                    onAccountSelect={(accountId) => router.push(`/dashboard/bank-accounts?account=${accountId}`)}
                    onRefresh={refetchData}
                  />
                </div>
              </div>

              {/* Income vs Expenses Chart */}
              <IncomeExpenseChart
                totalIncome={financialData.totalIncome}
                totalExpenses={financialData.totalExpenses}
                recentTransactions={financialData.recentTransactions}
                isLoading={isLoading}
              />

              {/* Usage Tracker */}
              <UsageTracker />

              {/* Add RecurringTransactions component if there are recurring expenses */}
              {financialData.recurringExpenses &&
                financialData.recurringExpenses.length > 0 && (
                  <RecurringTransactions />
                )}
            </>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !financialData.hasConnectedAccounts ? (
            <ConnectAccountPrompt onSuccess={handleAccountConnected} />
          ) : (
            <AccountBalanceCards
              accounts={financialData.bankAccounts.map((account) => ({
                id: account.id,
                name: account.name,
                institution: account.institution,
                balance: account.balance,
                currency: account.currency,
                businessId: account.businessId,
                lastSync: account.lastSync,
                accountNumber: account.accountNumber,
                accountType: account.accountType,
              }))}
              onRefresh={refetchData}
              isRefreshing={isLoading || isRefreshing}
            />
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <RecentTransactions
            isLoading={isLoading}
            hasConnectedAccounts={financialData.hasConnectedAccounts}
            recentTransactions={financialData.recentTransactions}
            bankAccounts={financialData.bankAccounts}
            isRefreshing={isRefreshing}
            onAccountConnected={handleAccountConnected}
            onRefresh={handleRefreshTransactions}
          />

          <PendingDocuments pendingCount={financialData.pendingReceipts} />
        </TabsContent>

        {userRole === "ACCOUNTANT" && (
          <TabsContent value="clients" className="space-y-4">
            <ClientOverview clients={mockClients} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
