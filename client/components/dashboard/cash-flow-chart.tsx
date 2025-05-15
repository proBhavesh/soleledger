"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCwIcon } from "lucide-react";
import { BankAccount } from "@/lib/types/dashboard";

interface CashFlowChartProps {
  title?: string;
  description?: string;
  bankAccounts: BankAccount[];
  isRefreshing: boolean;
  onRefresh: (bankAccountId: string) => Promise<void>;
}

export function CashFlowChart({
  title = "Cash Flow Overview",
  description = "Income vs. Expenses for the last 30 days",
  bankAccounts,
  isRefreshing,
  onRefresh,
}: CashFlowChartProps) {
  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => bankAccounts?.[0]?.id && onRefresh(bankAccounts[0].id)}
          disabled={isRefreshing || !bankAccounts.length}
        >
          {isRefreshing ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCwIcon className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-80 w-full flex items-center justify-center border-b border-dashed pb-4">
          <p className="text-muted-foreground">
            Chart component will be implemented here
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
