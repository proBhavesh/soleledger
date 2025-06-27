import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEnrichedTransactions, syncAllBankAccountsInBackground } from "@/lib/actions/plaid";
import { getBankAccounts } from "@/lib/actions/plaid/accounts";
import { TransactionsPage } from "./transactions-page";
import type { PageProps } from "@/lib/types/transactions";

export default async function TransactionsPageWrapper({
  searchParams,
}: PageProps) {
  // Verify authentication
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/transactions");
  }

  // Trigger background sync of all bank accounts (non-blocking)
  syncAllBankAccountsInBackground().catch(error => {
    console.error("Background sync error:", error);
    // Don't block page load if sync fails
  });

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
    accountId: params.accountId,
    type: params.type,
    minAmount: params.min,
    maxAmount: params.max,
  };

  // Fetch transactions with enriched data and filters
  const transactionsResult = await getEnrichedTransactions(
    limit,
    offset,
    filters
  );

  // Fetch bank accounts for filtering
  const bankAccountsResult = await getBankAccounts();

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
      bankAccounts={
        bankAccountsResult.success ? bankAccountsResult.accounts || [] : []
      }
    />
  );
}
