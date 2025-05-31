"use client";

import { useState } from "react";
import { ReconciliationDashboard } from "@/components/dashboard/reconciliation/reconciliation-dashboard";
import { UnmatchedTransactions } from "@/components/dashboard/reconciliation/unmatched-transactions";

export default function ReconciliationPage() {
  const [currentView, setCurrentView] = useState<"dashboard" | "unmatched">(
    "dashboard"
  );

  const handleViewUnmatched = () => {
    setCurrentView("unmatched");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
  };

  return (
    <div className="space-y-6">
      {currentView === "dashboard" ? (
        <ReconciliationDashboard onViewUnmatched={handleViewUnmatched} />
      ) : (
        <UnmatchedTransactions onBack={handleBackToDashboard} />
      )}
    </div>
  );
}
