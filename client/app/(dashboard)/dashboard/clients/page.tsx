import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientsPage } from "@/components/dashboard/clients/clients-page";
import { getUserBusinesses } from "@/lib/actions/business-context-actions";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Only accountants can access this page
  if (session.user.role !== "ACCOUNTANT") {
    redirect("/dashboard");
  }

  // Get user's available businesses
  const businessesResult = await getUserBusinesses();
  
  if (!businessesResult.success) {
    throw new Error("Failed to load businesses");
  }

  return (
    <ClientsPage 
      initialBusinesses={businessesResult.businesses || []}
    />
  );
}