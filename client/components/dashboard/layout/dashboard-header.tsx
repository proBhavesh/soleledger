"use client";

import WelcomeBanner from "@/components/dashboard/overview/welcome-banner";

interface DashboardHeaderProps {
  userName: string;
  showWelcomeBanner: boolean;
  subscriptionStatus?: string;
}

export function DashboardHeader({
  userName,
  showWelcomeBanner,
  subscriptionStatus,
}: DashboardHeaderProps) {
  return (
    <>
      {/* Show welcome banner if subscription param is present */}
      {showWelcomeBanner && subscriptionStatus && (
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
    </>
  );
}
