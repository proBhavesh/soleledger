"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { getAccountBalanceHistory } from "@/lib/actions/plaid";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, BarChart, LineChart, PieChart } from "lucide-react";
import { BalanceHistoryPoint } from "@/lib/types/dashboard";
import {
  Area,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";

// Define types for chart data
interface ChartDataPoint {
  date: Date;
  balance: number;
  formattedDate: string;
}

// Define types for time range and chart type
type TimeRangeType = "7d" | "30d" | "90d" | "1y";
type ChartType = "line" | "bar" | "composed";

// Define a custom tooltip props interface based on Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
}

interface AccountBalanceChartProps {
  accountId: string;
  accountName: string;
  currentBalance: number;
  currency?: string;
}

export function AccountBalanceChart({
  accountId,
  accountName,
  currentBalance,
  currency = "USD",
}: AccountBalanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeType>("30d");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistoryPoint[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBalanceHistory() {
      setIsLoading(true);
      try {
        // Call the server action to get real balance history data
        const result = await getAccountBalanceHistory(accountId, timeRange);

        if (result.success && result.history) {
          setBalanceHistory(result.history);
        } else {
          console.error("Failed to fetch balance history:", result.error);
          // Fall back to empty array, which will show a friendly message
          setBalanceHistory([]);
        }
      } catch (error) {
        console.error("Failed to fetch balance history:", error);
        setBalanceHistory([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalanceHistory();
  }, [accountId, timeRange, currentBalance]);

  // Helper function to format date based on time range
  const formatDateForDisplay = (date: Date) => {
    if (timeRange === "7d" || timeRange === "30d") {
      return format(date, "MMM dd");
    } else if (timeRange === "90d") {
      return format(date, "MMM dd");
    } else {
      return format(date, "MMM yyyy");
    }
  };

  // Transform data for Recharts
  const chartData = balanceHistory.map((point) => ({
    date: point.date,
    balance: point.balance,
    formattedDate: formatDateForDisplay(new Date(point.date)),
  }));

  // Get min and max for better visualizations
  const minBalance = Math.min(
    ...(balanceHistory.map((p) => p.balance).length
      ? balanceHistory.map((p) => p.balance)
      : [0])
  );
  const maxBalance = Math.max(
    ...(balanceHistory.map((p) => p.balance).length
      ? balanceHistory.map((p) => p.balance)
      : [currentBalance])
  );

  // Add a small buffer to min/max for better visualization
  const yAxisDomain = [
    Math.max(0, minBalance * 0.9), // Don't go below zero, and add some padding at the bottom
    maxBalance * 1.1, // Add some padding at the top
  ];

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-2 text-sm">
          <p className="font-medium">{payload[0].payload.formattedDate}</p>
          <p className="text-primary">
            Balance: {formatCurrency(payload[0].value, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">
            {accountName} Balance History
          </CardTitle>
          <CardDescription>
            Track your account balance over time based on real transaction data
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={chartType === "line" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setChartType("line")}
          >
            <LineChart className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setChartType("bar")}
          >
            <BarChart className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === "composed" ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setChartType("composed")}
            title="Combined Chart"
          >
            <PieChart className="h-4 w-4" />
          </Button>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRangeType)}
          >
            <SelectTrigger className="w-[100px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : balanceHistory.length === 0 ? (
          <div className="w-full h-[300px] flex items-center justify-center flex-col text-center">
            <p className="text-muted-foreground mb-2">
              No balance history available for this timeframe.
            </p>
            <p className="text-sm text-muted-foreground">
              Try selecting a different time range or check back later.
            </p>
          </div>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <RechartsLineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    tickFormatter={(value) => value}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      formatCurrency(value, currency, { notation: "compact" })
                    }
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 2 }}
                    activeDot={{ r: 4 }}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    isAnimationActive={true}
                  />
                </RechartsLineChart>
              ) : chartType === "bar" ? (
                <RechartsBarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    tickFormatter={(value) => value}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      formatCurrency(value, currency, { notation: "compact" })
                    }
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="balance"
                    fill="hsl(var(--primary))"
                    animationDuration={1000}
                    animationEasing="ease-out"
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              ) : (
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    tickFormatter={(value) => value}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      formatCurrency(value, currency, { notation: "compact" })
                    }
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    fill="hsl(var(--primary) / 0.2)"
                    stroke="transparent"
                    animationDuration={1200}
                    isAnimationActive={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 2 }}
                    activeDot={{ r: 4 }}
                    animationDuration={1000}
                    isAnimationActive={true}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
