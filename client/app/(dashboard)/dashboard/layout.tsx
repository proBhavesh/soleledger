import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardHeader } from "@/components/dashboard/header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

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

  return (
		<div className="flex min-h-screen flex-col">
			<DashboardHeader />
			<div className="flex-1 items-start md:grid md:grid-cols-[260px_1fr] md:gap-4 lg:grid-cols-[280px_1fr]">
				<aside className="fixed top-16 z-30 hidden h-[calc(100vh-5rem)] w-full shrink-0 md:sticky md:block overflow-y-auto">
					<DashboardNav />
				</aside>
				<main className="flex w-full flex-col overflow-hidden p-6">
					{children}
				</main>
			</div>
		</div>
  );
}
