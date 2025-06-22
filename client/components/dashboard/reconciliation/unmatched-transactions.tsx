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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Search,
  Link2,
  FileText,
  Calendar,
  DollarSign,
  RefreshCw,
  FileSearch,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUnmatchedTransactions,
  updateReconciliationStatus,
  unmatchTransaction,
} from "@/lib/actions/reconciliation-actions";
import { ManualMatchDialog } from "./manual-match-dialog";
import type { UnmatchedTransaction, UnmatchedTransactionsProps } from "@/lib/types/reconciliation";

export function UnmatchedTransactions({ onBack }: UnmatchedTransactionsProps) {
  const [transactions, setTransactions] = useState<UnmatchedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UnmatchedTransaction | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const result = await getUnmatchedTransactions(100, 0);
      if (result.success && result.data) {
        setTransactions(result.data);
      } else {
        toast.error("Failed to load unmatched transactions");
      }
    } catch {
      toast.error("Failed to load unmatched transactions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleStatusUpdate = async (
    transactionId: string,
    status: string,
    documentId?: string,
    notes?: string
  ) => {
    try {
      setIsUpdating(true);
      const result = await updateReconciliationStatus({
        transactionId,
        status: status as
          | "UNMATCHED"
          | "MATCHED"
          | "PARTIALLY_MATCHED"
          | "PENDING_REVIEW"
          | "MANUALLY_MATCHED"
          | "EXCLUDED",
        documentId,
        notes,
      });

      if (result.success) {
        toast.success("Reconciliation status updated");
        await fetchTransactions();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "CAD",
    }).format(Math.abs(amount));
  };

  const handleManualMatch = (transaction: UnmatchedTransaction) => {
    setSelectedTransaction(transaction);
    setShowMatchDialog(true);
  };

  const handleUnmatch = async (transactionId: string) => {
    try {
      setIsUpdating(true);
      const result = await unmatchTransaction(transactionId);
      
      if (result.success) {
        toast.success("Transaction unmatched successfully");
        await fetchTransactions();
      } else {
        toast.error(result.error || "Failed to unmatch transaction");
      }
    } catch {
      toast.error("Failed to unmatch transaction");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNMATCHED":
        return <Badge variant="destructive">Unmatched</Badge>;
      case "PENDING_REVIEW":
        return <Badge variant="outline">Pending Review</Badge>;
      case "PARTIALLY_MATCHED":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      transaction.reconciliationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">
              Loading unmatched transactions...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Unmatched Transactions
          </h2>
          <p className="text-muted-foreground">
            Review and manually reconcile transactions that need attention
          </p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm">
              Back to Dashboard
            </Button>
          )}
          <Button onClick={fetchTransactions} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="UNMATCHED">Unmatched</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Requiring Attention</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction
            {filteredTransactions.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                No unmatched transactions found
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Potential Matches</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48">
                          <p className="font-medium truncate">
                            {transaction.description || "No description"}
                          </p>
                          {transaction.bankAccount && (
                            <p className="text-xs text-muted-foreground">
                              {transaction.bankAccount}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {transaction.category || "Uncategorized"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.reconciliationStatus)}
                      </TableCell>
                      <TableCell>
                        {transaction.potentialMatches &&
                        transaction.potentialMatches.length > 0 ? (
                          <div className="space-y-1">
                            {transaction.potentialMatches
                              .slice(0, 2)
                              .map((match) => (
                                <div
                                  key={match.documentId}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <FileText className="h-3 w-3 text-blue-500" />
                                  <span className="truncate max-w-32">
                                    {match.extractedVendor ||
                                      match.documentName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-1 py-0"
                                  >
                                    {Math.round(match.confidence * 100)}%
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            None found
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManualMatch(transaction)}
                            disabled={isUpdating}
                          >
                            <FileSearch className="h-3 w-3 mr-1" />
                            Find Match
                          </Button>
                          {transaction.potentialMatches &&
                            transaction.potentialMatches.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleStatusUpdate(
                                    transaction.id,
                                    "MANUALLY_MATCHED",
                                    transaction.potentialMatches![0].documentId,
                                    "Matched with highest confidence document"
                                  )
                                }
                                disabled={isUpdating}
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Quick Match
                              </Button>
                            )}
                          {transaction.reconciliationStatus === "MATCHED" ||
                          transaction.reconciliationStatus === "MANUALLY_MATCHED" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnmatch(transaction.id)}
                              disabled={isUpdating}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Unmatch
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleStatusUpdate(
                                  transaction.id,
                                  "EXCLUDED",
                                  undefined,
                                  "Manually excluded"
                                )
                              }
                              disabled={isUpdating}
                            >
                              Exclude
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Match Dialog */}
      {selectedTransaction && (
        <ManualMatchDialog
          open={showMatchDialog}
          onOpenChange={setShowMatchDialog}
          transaction={selectedTransaction}
          onSuccess={() => {
            fetchTransactions();
            setShowMatchDialog(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
}
