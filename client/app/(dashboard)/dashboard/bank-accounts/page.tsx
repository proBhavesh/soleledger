import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBankAccounts } from "@/lib/actions/plaid";
import { getCurrentBusinessId } from "@/lib/actions/business-context-actions";
import { BankAccountsPage } from "./bank-accounts-page";

export const metadata = {
  title: "Bank Accounts | SoleLedger",
  description: "Manage your connected financial accounts and view balances",
};

export default async function BankAccountsPageWrapper() {
  // Verify authentication
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/bank-accounts");
  }

  // Get the current business ID
  const businessId = await getCurrentBusinessId();
  
  if (!businessId) {
    // No business found, redirect to dashboard
    redirect("/dashboard");
  }

  // Get bank accounts data from server
  try {
    const accountsData = await getBankAccounts(businessId);

    return (
      <BankAccountsPage
        initialAccounts={accountsData.accounts || []}
        error={null}
      />
    );
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return (
      <BankAccountsPage
        initialAccounts={[]}
        error={
          error instanceof Error
            ? error.message
            : "Failed to load bank accounts"
        }
      />
    );
  }
}
