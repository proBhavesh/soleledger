"use client";

import { useState, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionList } from "@/components/dashboard/transactions/transaction-list";
import { TransactionInsights } from "@/components/dashboard/transactions/transaction-insights";
import { Pagination } from "@/components/dashboard/transactions/pagination";
import { TransactionFilters, TransactionFilterValues } from "@/components/dashboard/transactions/transaction-filters";
import { SyncStatus } from "@/components/dashboard/transactions/sync-status";
import { Transaction } from "@/lib/types/dashboard";
import { getEnrichedTransactions } from "@/lib/actions/plaid";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import type { TransactionsPageProps } from "@/lib/types/transactions";

export function TransactionsPage({
  initialTransactions,
  totalTransactions,
  currentPage,
  pageSize,
  searchParams,
  error,
  bankAccounts,
}: TransactionsPageProps) {
  // Handle potential Promise from searchParams in Next.js 15
  const params =
    searchParams instanceof Promise ? use(searchParams) : searchParams;

  const router = useRouter();
  const queryParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialTransactions || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    params.category || "all"
  );
  const [selectedAccount, setSelectedAccount] = useState(
    params.accountId || "all"
  );
  const [searchTerm, setSearchTerm] = useState(params.search || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    params.from && params.to
      ? {
          from: new Date(params.from),
          to: new Date(params.to),
        }
      : undefined
  );

  // Listen for URL changes to detect when pagination loading should stop
  useEffect(() => {
    // Stop pagination loading when component receives new transactions
    setIsPaginationLoading(false);
  }, [initialTransactions]);

  // Update URL with filters
  const updateUrlWithFilters = (
    filters: Record<string, string | number | null>
  ) => {
    const params = new URLSearchParams();

    // Keep existing params
    for (const [key, value] of queryParams.entries()) {
      if (!Object.keys(filters).includes(key)) {
        params.set(key, value);
      }
    }

    // Update with new filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    router.push(`/dashboard/transactions?${params.toString()}`);
  };

  // Refresh transactions
  const refreshTransactions = async () => {
    setIsLoading(true);
    try {
      // Build filters object
      const filters = {
        category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
        search: searchTerm || undefined,
        dateFrom: dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        accountId: selectedAccount && selectedAccount !== "all" ? selectedAccount : undefined,
      };

      const result = await getEnrichedTransactions(
        pageSize,
        (currentPage - 1) * pageSize,
        filters
      );

      if (result.success && result.transactions) {
        setTransactions(result.transactions);
        toast.success("Transactions refreshed");
      } else {
        toast.error(result.error || "Failed to refresh transactions");
      }
    } catch {
      toast.error("An error occurred while refreshing transactions");
    } finally {
      setIsLoading(false);
    }
  };


  // Client-side data fetching for pagination
  const fetchPageData = async (page: number) => {
    setIsPaginationLoading(true);

    try {
      // Build filters object
      const filters = {
        category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
        search: searchTerm || undefined,
        dateFrom: dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        accountId: selectedAccount && selectedAccount !== "all" ? selectedAccount : undefined,
      };

      const result = await getEnrichedTransactions(
        pageSize,
        (page - 1) * pageSize,
        filters
      );

      if (result.success && result.transactions) {
        setTransactions(result.transactions);
      } else {
        toast.error(result.error || "Failed to load transactions");
      }
    } catch {
      toast.error("An error occurred while loading transactions");
    } finally {
      setIsPaginationLoading(false);
    }
  };

  // Handle pagination - now with client-side data fetching for faster UX
  const handlePageChange = (page: number) => {
    setIsPaginationLoading(true);

    // Update URL first (to maintain state)
    updateUrlWithFilters({ page });

    // Then fetch data client-side for a better UX
    fetchPageData(page);
  };

  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(
    new Set(transactions.map((t) => t.category))
  ).filter(Boolean);

  // Handle all filters change from TransactionFilters component
  const handleFiltersChange = (filters: TransactionFilterValues) => {
    const urlFilters: Record<string, string | number | null> = {
      page: 1,
      search: filters.search || null,
      category: filters.category || null,
      accountId: filters.accountId || null,
      from: filters.dateRange?.from ? format(filters.dateRange.from, "yyyy-MM-dd") : null,
      to: filters.dateRange?.to ? format(filters.dateRange.to, "yyyy-MM-dd") : null,
      type: filters.type || null,
      min: filters.minAmount ? String(filters.minAmount) : null,
      max: filters.maxAmount ? String(filters.maxAmount) : null,
    };

    // Update local state
    setSearchTerm(filters.search || "");
    setSelectedCategory(filters.category || "all");
    setSelectedAccount(filters.accountId || "all");
    
    // Handle DateRange conversion properly
    if (filters.dateRange && filters.dateRange.from) {
      setDateRange({
        from: filters.dateRange.from,
        to: filters.dateRange.to
      });
    } else {
      setDateRange(undefined);
    }

    updateUrlWithFilters(urlFilters);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View and manage your financial transactions with enriched data
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <div className="flex flex-col space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                      All your financial activities with enriched transaction data
                    </CardDescription>
                  </div>
                  <SyncStatus 
                    bankAccounts={bankAccounts}
                    onSyncComplete={refreshTransactions}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <TransactionFilters
                  categories={uniqueCategories}
                  accounts={bankAccounts.map(account => ({
                    id: account.id,
                    name: `${account.name}${account.institution ? ` - ${account.institution}` : ""}`
                  }))}
                  onFiltersChange={handleFiltersChange}
                />
              </CardContent>
            </Card>

            <TransactionList
              transactions={transactions}
              isLoading={isLoading || isPaginationLoading}
            />

            <Pagination
              currentPage={currentPage}
              totalItems={totalTransactions}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              isLoading={isPaginationLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <TransactionInsights transactions={transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
