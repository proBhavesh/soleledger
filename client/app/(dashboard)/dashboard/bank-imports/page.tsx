import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentBusinessId } from "@/lib/actions/business-context-actions";
import { getBankAccounts } from "@/lib/actions/plaid";
import { BankImportsPage } from "./bank-imports-page";

export const metadata = {
  title: "Bank Statement Imports | SoleLedger",
  description: "Import bank statements and process transactions",
};

export default async function BankImportsPageWrapper() {
  // Verify authentication
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/bank-imports");
  }

  // Get the current business ID
  const businessId = await getCurrentBusinessId();
  
  if (!businessId) {
    // No business found, redirect to dashboard
    redirect("/dashboard");
  }

  // Get bank accounts for the dropdown
  try {
    const accountsData = await getBankAccounts(businessId);

    return (
      <BankImportsPage
        bankAccounts={accountsData.accounts || []}
        error={null}
      />
    );
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return (
      <BankImportsPage
        bankAccounts={[]}
        error={
          error instanceof Error
            ? error.message
            : "Failed to load bank accounts"
        }
      />
    );
  }
}