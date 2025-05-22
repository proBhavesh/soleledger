"use client";

import { useState } from "react";
import { AccountBalanceChart } from "@/components/dashboard/charts/account-balance-chart";
import { BankAccount } from "@/lib/types/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountBalanceCardsProps {
  accounts: BankAccount[];
  className?: string;
}

export function AccountBalanceCards({
  accounts,
  className,
}: AccountBalanceCardsProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (!accounts || accounts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Account Balance History</CardTitle>
          <CardDescription>
            No accounts connected yet. Connect a bank account to see balance
            history.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Account Balance History
        </h2>
        <div className="flex space-x-1">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
            title="List View"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        )}
      >
        {accounts.map((account) => (
          <AccountBalanceChart
            key={account.id}
            accountId={account.id}
            accountName={account.name}
            currentBalance={account.balance || 0}
            currency={account.currency}
          />
        ))}
      </div>
    </div>
  );
}
