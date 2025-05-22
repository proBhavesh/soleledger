import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEnrichedTransactions } from "@/lib/actions/plaid";
import { TransactionsPage } from "./transactions-page";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    category?: string;
    search?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function TransactionsPageWrapper({
  searchParams,
}: PageProps) {
  // Verify authentication
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/transactions");
  }

  // Properly await searchParams to access its properties
  const params = await searchParams;

  // Parse query parameters
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "10", 10);
  const offset = (page - 1) * limit;

  // Build filters object from search params
  const filters = {
    category: params.category,
    search: params.search,
    dateFrom: params.from,
    dateTo: params.to,
  };

  // Fetch transactions with enriched data and filters
  const transactionsResult = await getEnrichedTransactions(
    limit,
    offset,
    filters
  );

  return (
    <TransactionsPage
      initialTransactions={
        transactionsResult.success ? transactionsResult.transactions || [] : []
      }
      totalTransactions={
        transactionsResult.success ? transactionsResult.total || 0 : 0
      }
      currentPage={page}
      pageSize={limit}
      searchParams={params}
      error={
        transactionsResult.success
          ? null
          : transactionsResult.error || "Unknown error"
      }
    />
  );
}
