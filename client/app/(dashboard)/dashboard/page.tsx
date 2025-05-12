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
import {
  ArrowUpIcon,
  DollarSignIcon,
  FileTextIcon,
  InfoIcon,
  ReceiptIcon,
  Landmark,
  LoaderCircle,
} from "lucide-react";
import WelcomeBanner from "@/components/dashboard/welcome-banner";
import { BankAccountsSummary } from "@/components/dashboard/bank-accounts-summary";
import { PlaidLinkButton } from "@/components/dashboard/plaid-link-button";
import { getFinancialSummary } from "@/lib/actions/plaid-actions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// Transaction type from API
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string | Date;
  category: string;
}

// Financial summary data
interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  pendingReceipts: number;
  totalBalance: number;
  recentTransactions: Transaction[];
  hasConnectedAccounts: boolean;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [financialData, setFinancialData] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    pendingReceipts: 0,
    totalBalance: 0,
    recentTransactions: [],
    hasConnectedAccounts: false,
  });

  const userRole = session?.user?.role || "BUSINESS_OWNER";
  const userName = session?.user?.name || "User";

  // Check if the user just completed the subscription flow
  const subscriptionStatus = searchParams?.get("subscription") as
    | string
    | undefined;
  const showWelcomeBanner = !!subscriptionStatus;

  // Fetch financial data on load
  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      const data = await getFinancialSummary();
      setFinancialData(data);
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
      {/* Show welcome banner if subscription param is present */}
      {showWelcomeBanner && (
        <WelcomeBanner
          userName={userName}
          subscriptionType={subscriptionStatus as "trial" | "success"}
        />
      )}

      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userName}! Here&apos;s an overview of your financial
          data.
        </p>
      </div>

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
            <Card className="p-6 flex flex-col items-center text-center">
              <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">
                Connect your bank account
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Connect your bank account to see real-time financial data and
                automate your bookkeeping process.
              </p>
              <PlaidLinkButton onSuccess={handleAccountConnected} />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Cash In
                    </CardTitle>
                    <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(financialData.totalIncome)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-500 flex items-center gap-1">
                        <ArrowUpIcon className="h-3.5 w-3.5" />
                        Last 30 days
                      </span>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Cash Out
                    </CardTitle>
                    <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(financialData.totalExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-red-500 flex items-center gap-1">
                        <ArrowUpIcon className="h-3.5 w-3.5" />
                        Last 30 days
                      </span>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending Receipts
                    </CardTitle>
                    <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {financialData.pendingReceipts}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financialData.pendingReceipts > 0 ? (
                        <span className="text-amber-500 flex items-center gap-1">
                          <InfoIcon className="h-3.5 w-3.5" />
                          Needs attention
                        </span>
                      ) : (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <InfoIcon className="h-3.5 w-3.5" />
                          All receipts processed
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Balance
                    </CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(financialData.totalBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <InfoIcon className="h-3.5 w-3.5" />
                        Current balance
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Cash Flow Overview</CardTitle>
                    <CardDescription>
                      Income vs. Expenses for the last 30 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <div className="h-80 w-full flex items-center justify-center border-b border-dashed pb-4">
                      <p className="text-muted-foreground">
                        Chart component will be implemented here
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
            </>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !financialData.hasConnectedAccounts ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">
                    Connect your bank account to see your recent transactions
                  </p>
                  <PlaidLinkButton onSuccess={handleAccountConnected} />
                </div>
              ) : financialData.recentTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No recent transactions found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {financialData.recentTransactions.map((transaction) => (
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

          <Card>
            <CardHeader>
              <CardTitle>Pending Documents</CardTitle>
              <CardDescription>
                Receipts and invoices awaiting your attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialData.pendingReceipts === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">
                      No pending documents
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <div className="flex flex-col gap-2 p-4">
                        <div className="flex items-center">
                          <ReceiptIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Lunch Receipt
                          </span>
                          <span className="ml-auto font-medium">$32.50</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span>No transaction matched</span>
                          <span className="mx-2">•</span>
                          <span>Uploaded Oct 12, 2023</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border">
                      <div className="flex flex-col gap-2 p-4">
                        <div className="flex items-center">
                          <ReceiptIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Office Equipment Invoice
                          </span>
                          <span className="ml-auto font-medium">$899.99</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span>Suggested match found</span>
                          <span className="mx-2">•</span>
                          <span>Uploaded Oct 11, 2023</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === "ACCOUNTANT" && (
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
                <CardDescription>
                  Status of your client accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium">Acme Inc.</span>
                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          Complete
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>Last updated: Oct 12, 2023</span>
                        <span className="mx-2">•</span>
                        <span>11 transactions pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border">
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium">Widget Co.</span>
                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                          Needs Review
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>Last updated: Oct 10, 2023</span>
                        <span className="mx-2">•</span>
                        <span>8 transactions pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border">
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium">Globex Corp</span>
                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                          Attention Needed
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>Last updated: Oct 8, 2023</span>
                        <span className="mx-2">•</span>
                        <span>24 transactions pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
