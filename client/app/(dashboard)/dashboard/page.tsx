"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoaderCircle } from "lucide-react";
import { BankAccountsSummary } from "@/components/dashboard/bank-accounts-summary";
import { RecurringTransactions } from "@/components/dashboard/recurring-transactions";
import { getFinancialSummary, refreshTransactions } from "@/lib/actions/plaid";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FinancialMetrics } from "@/components/dashboard/financial-metrics";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { ConnectAccountPrompt } from "@/components/dashboard/connect-account-prompt";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { PendingDocuments } from "@/components/dashboard/pending-documents";
import { ClientOverview } from "@/components/dashboard/client-overview";
import { Client } from "@/lib/types/dashboard";
import type { FinancialSummary as FinancialSummaryType } from "@/lib/types/dashboard";

// Transaction type from API
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string | Date;
  category: string;
}

// BankAccount type
interface BankAccount {
  id: string;
  name: string;
  balance: number;
  institution: string;
  lastSync?: Date | null;
  // Add other fields as needed
}

// Financial summary data
interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  pendingReceipts: number;
  totalBalance: number;
  recentTransactions: Transaction[];
  hasConnectedAccounts: boolean;
  recurringExpenses: any[];
  bankAccounts: BankAccount[]; // Added for refresh functionality
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialSummaryType>({
    totalIncome: 0,
    totalExpenses: 0,
    pendingReceipts: 0,
    totalBalance: 0,
    recentTransactions: [],
    hasConnectedAccounts: false,
    recurringExpenses: [],
    bankAccounts: [],
  });

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

  // Fetch financial data on load
  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      const data = await getFinancialSummary();
      setFinancialData(data as unknown as FinancialSummaryType);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast.error("Failed to load financial data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Handle successful Plaid account connection
  const handleAccountConnected = () => {
    fetchFinancialData();
  };

  // Handle refreshing transaction data
  const handleRefreshTransactions = async (bankAccountId: string) => {
    setIsRefreshing(true);
    try {
      const result = await refreshTransactions(bankAccountId);
      if (result.success) {
        toast.success(result.message || "Transactions refreshed successfully");
        fetchFinancialData();
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
    <div className="flex flex-col gap-5">
      <DashboardHeader
        userName={userName}
        showWelcomeBanner={showWelcomeBanner}
        subscriptionStatus={subscriptionStatus}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          {userRole === "ACCOUNTANT" && (
            <TabsTrigger value="clients">Clients</TabsTrigger>
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
                />
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Bank Accounts</CardTitle>
                    <CardDescription>
                      Your connected financial accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BankAccountsSummary />
                  </CardContent>
                </Card>
              </div>

              {/* Add RecurringTransactions component if there are recurring expenses */}
              {financialData.recurringExpenses &&
                financialData.recurringExpenses.length > 0 && (
                  <RecurringTransactions />
                )}
            </>
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
