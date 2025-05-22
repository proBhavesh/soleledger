"use client";

import { useState, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionsHeader } from "@/components/dashboard/transactions/transactions-header";
import { TransactionList } from "@/components/dashboard/transactions/transaction-list";
import { TransactionInsights } from "@/components/dashboard/transactions/transaction-insights";
import { Pagination } from "@/components/dashboard/transactions/pagination";
import { Transaction } from "@/lib/types/dashboard";
import { getEnrichedTransactions } from "@/lib/actions/plaid";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface TransactionsPageProps {
  initialTransactions: Transaction[];
  totalTransactions: number;
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
  error: string | null;
}

export function TransactionsPage({
  initialTransactions,
  totalTransactions,
  currentPage,
  pageSize,
  searchParams,
  error,
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
    params.category || ""
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
        category: selectedCategory || undefined,
        search: searchTerm || undefined,
        dateFrom: dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
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

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    updateUrlWithFilters({ search: term || null, page: 1 });
  };

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    updateUrlWithFilters({ category: category || null, page: 1 });
  };

  // Handle date range filter
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);

    if (range?.from) {
      updateUrlWithFilters({
        from: format(range.from, "yyyy-MM-dd"),
        to: range.to ? format(range.to, "yyyy-MM-dd") : null,
        page: 1,
      });
    } else {
      updateUrlWithFilters({ from: null, to: null, page: 1 });
    }
  };

  // Client-side data fetching for pagination
  const fetchPageData = async (page: number) => {
    setIsPaginationLoading(true);

    try {
      // Build filters object
      const filters = {
        category: selectedCategory || undefined,
        search: searchTerm || undefined,
        dateFrom: dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
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
            <TransactionsHeader
              title="Transaction History"
              description="All your financial activities with enriched transaction data"
              onSearch={handleSearch}
              onRefresh={refreshTransactions}
              onFilter={handleCategoryFilter}
              onDateRangeChange={handleDateRangeChange}
              categories={uniqueCategories}
              selectedCategory={selectedCategory}
              searchTerm={searchTerm}
              isLoading={isLoading}
              dateRange={dateRange}
            />

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
