"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  FileText,
  RefreshCw,
  Link,
} from "lucide-react";
import { toast } from "sonner";
import {
  getReconciliationSummary,
  autoReconcileTransactions,
  type ReconciliationSummary,
} from "@/lib/actions/reconciliation-actions";

interface ReconciliationDashboardProps {
  onViewUnmatched?: () => void;
}

export function ReconciliationDashboard({
  onViewUnmatched,
}: ReconciliationDashboardProps) {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const result = await getReconciliationSummary();
      if (result.success && result.data) {
        setSummary(result.data);
      } else {
        toast.error("Failed to load reconciliation summary");
      }
    } catch {
      toast.error("Failed to load reconciliation summary");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleAutoReconcile = async () => {
    try {
      setIsAutoReconciling(true);
      const result = await autoReconcileTransactions();
      if (result.success && result.data) {
        toast.success(
          `Auto-reconciled ${result.data.matched} out of ${result.data.processed} transactions`
        );
        // Refresh summary after auto-reconciliation
        await fetchSummary();
      } else {
        toast.error(result.error || "Failed to auto-reconcile transactions");
      }
    } catch {
      toast.error("Failed to auto-reconcile transactions");
    } finally {
      setIsAutoReconciling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardTitle>
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-7 bg-muted rounded animate-pulse mb-1" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              Failed to load reconciliation data
            </p>
            <Button onClick={fetchSummary} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90)
      return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (percentage >= 70)
      return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (percentage >= 50)
      return (
        <Badge className="bg-orange-100 text-orange-800">Needs Attention</Badge>
      );
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Reconciliation Dashboard
          </h2>
          <p className="text-muted-foreground">
            Track how well your transactions are matched with supporting
            documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSummary} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleAutoReconcile}
            disabled={isAutoReconciling}
            size="sm"
          >
            {isAutoReconciling ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link className="h-4 w-4 mr-2" />
            )}
            Auto-Reconcile
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalTransactions}
            </div>
            <p className="text-xs text-muted-foreground">Last 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.matchedTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.matchedPercentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.unmatchedTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.pendingReview > 0 &&
                `${summary.pendingReview} pending review`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getStatusColor(
                summary.matchedPercentage
              )}`}
            >
              {summary.matchedPercentage.toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(summary.matchedPercentage)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Progress</CardTitle>
          <CardDescription>
            Visual breakdown of transaction matching status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{summary.matchedPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={summary.matchedPercentage} className="h-2" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">By Count</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm">Matched</span>
                  </div>
                  <span className="text-sm font-medium">
                    {summary.matchedTransactions}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span className="text-sm">Pending Review</span>
                  </div>
                  <span className="text-sm font-medium">
                    {summary.pendingReview}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm">Unmatched</span>
                  </div>
                  <span className="text-sm font-medium">
                    {summary.unmatchedTransactions}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">By Amount</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Matched</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(summary.matchedAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Unmatched</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(summary.unmatchedAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(summary.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {summary.unmatchedTransactions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
            <CardDescription>
              Items that need your attention to improve reconciliation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Unmatched Transactions</h4>
                  <p className="text-sm text-muted-foreground">
                    {summary.unmatchedTransactions} transactions need to be
                    matched with documents
                  </p>
                </div>
                <Button onClick={onViewUnmatched} variant="outline">
                  Review Now
                </Button>
              </div>

              {summary.pendingReview > 0 && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Pending Review</h4>
                    <p className="text-sm text-muted-foreground">
                      {summary.pendingReview} matches are waiting for your
                      confirmation
                    </p>
                  </div>
                  <Button onClick={onViewUnmatched} variant="outline">
                    Review
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
