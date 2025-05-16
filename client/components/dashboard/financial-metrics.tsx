"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpIcon,
  DollarSignIcon,
  InfoIcon,
  ReceiptIcon,
  Landmark,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { FinancialSummary } from "@/lib/types/dashboard";

interface FinancialMetricsProps {
  data: Pick<
    FinancialSummary,
    "totalIncome" | "totalExpenses" | "pendingReceipts" | "totalBalance"
  >;
}

export function FinancialMetrics({ data }: FinancialMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.totalIncome)}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-emerald-500 flex items-center gap-1">
              <ArrowUpIcon className="h-3.5 w-3.5" />
              Last 30 days
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.totalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-red-500 flex items-center gap-1">
              <ArrowUpIcon className="h-3.5 w-3.5" />
              Last 30 days
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending Receipts
          </CardTitle>
          <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pendingReceipts}</div>
          <p className="text-xs text-muted-foreground">
            {data.pendingReceipts > 0 ? (
              <span className="text-amber-500 flex items-center gap-1">
                <InfoIcon className="h-3.5 w-3.5" />
                Needs attention
              </span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1">
                <InfoIcon className="h-3.5 w-3.5" />
                All receipts processed
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <InfoIcon className="h-3.5 w-3.5" />
              Current balance
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
