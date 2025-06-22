"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  InfoIcon,
  ReceiptIcon,
  Landmark,
  TrendingUp,
  TrendingDown,
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
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cash In</CardTitle>
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {formatCurrency(data.totalIncome)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <ArrowUpIcon className="h-3.5 w-3.5" />
              +12.5% from last month
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-full blur-3xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cash Out</CardTitle>
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            {formatCurrency(data.totalExpenses)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
              <ArrowDownIcon className="h-3.5 w-3.5" />
              -8.2% from last month
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Pending Receipts
          </CardTitle>
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <ReceiptIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{data.pendingReceipts}</div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {data.pendingReceipts > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <InfoIcon className="h-3.5 w-3.5" />
                Needs attention
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <InfoIcon className="h-3.5 w-3.5" />
                All processed
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Balance</CardTitle>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {formatCurrency(data.totalBalance)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span className="flex items-center gap-1 font-medium">
              <InfoIcon className="h-3.5 w-3.5" />
              Across all accounts
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
