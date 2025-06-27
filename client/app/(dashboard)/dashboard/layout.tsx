import { DashboardNav } from "@/components/dashboard/layout/nav";
import { BusinessProvider } from "@/lib/contexts/business-context";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication check
  const session = await auth();

  // Redirect if not authenticated
  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // Check if user has an active subscription
  const subscription = await db.subscription.findFirst({
    where: {
      userId: session.user.id,
      status: {
        in: ["ACTIVE", "TRIAL", "PAST_DUE"],
      },
    },
  });

  // If no subscription found, redirect to pricing
  if (!subscription) {
    redirect("/pricing");
  }

  return (
    <BusinessProvider>
      <div className="flex h-screen overflow-hidden">
        <aside className="w-[260px] lg:w-[280px] border-r bg-background h-screen overflow-y-auto">
          <DashboardNav user={session.user} />
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </BusinessProvider>
  );
}
