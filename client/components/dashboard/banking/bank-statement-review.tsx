"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { importBankStatementTransactions } from "@/lib/actions/bank-statement-actions";
import { ErrorDialog } from "@/components/ui/error-dialog";
import type { BankStatementData } from "@/lib/ai/bank-statement-processor";
import type { DuplicateCheckResult, ImportBankStatementResponse } from "@/lib/types/bank-imports";

interface BankStatementReviewProps {
  documentId: string;
  bankAccountId: string;
  extractedData: BankStatementData;
  duplicateChecks: DuplicateCheckResult[];
  onBack: () => void;
  onSuccess: () => void;
}

export function BankStatementReview({
  documentId,
  bankAccountId,
  extractedData,
  duplicateChecks,
  onBack,
  onSuccess,
}: BankStatementReviewProps) {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(
    new Set(
      extractedData.transactions
        .map((_, index) => (duplicateChecks[index]?.isDuplicate ? null : index))
        .filter((index): index is number => index !== null)
    )
  );
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const duplicateCount = duplicateChecks.filter(check => check.isDuplicate).length;
  const selectedCount = selectedTransactions.size;

  const toggleTransaction = (index: number) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleAll = () => {
    if (selectedTransactions.size === extractedData.transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(
        new Set(extractedData.transactions.map((_, index) => index))
      );
    }
  };

  const selectNonDuplicates = () => {
    setSelectedTransactions(
      new Set(
        extractedData.transactions
          .map((_, index) => (duplicateChecks[index]?.isDuplicate ? null : index))
          .filter((index): index is number => index !== null)
      )
    );
  };

  const handleImport = async () => {
    if (selectedCount === 0) {
      toast.error("Please select at least one transaction to import");
      return;
    }

    setShowConfirmDialog(false);
    setIsImporting(true);
    setImportProgress(0);

    try {
      // Show initial progress
      setImportProgress(10);
      
      const result = await importBankStatementTransactions({
        documentId,
        bankAccountId,
        transactions: extractedData.transactions.map((tx, index) => ({
          ...tx,
          selected: selectedTransactions.has(index),
        })),
      });

      setImportProgress(100);

      const typedResult = result as ImportBankStatementResponse;
      if (typedResult.success && typedResult.data) {
        const { imported, failed, skipped } = typedResult.data;
        
        if (failed > 0) {
          toast.error(`Imported ${imported} transactions, ${failed} failed`);
        } else if (skipped > 0) {
          toast.success(`Successfully imported ${imported} transactions! (${skipped} transfers skipped)`);
        } else {
          toast.success(`Successfully imported ${imported} transactions!`);
        }
        
        // Small delay to show completion
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        // Show error dialog for import failures
        setErrorMessage(result.error || "Failed to import transactions. Please check your Chart of Accounts setup.");
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error("Error importing transactions:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to import transactions");
      setShowErrorDialog(true);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: extractedData.currency || "CAD",
    }).format(amount);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle>Review Bank Statement</CardTitle>
              <CardDescription>
                Review and select transactions to import
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {extractedData.transactions.length} transactions
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statement Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Bank</p>
              <p className="font-medium">{extractedData.bankName || "Unknown"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-medium">
                {extractedData.startDate && extractedData.endDate
                  ? `${format(new Date(extractedData.startDate), "MMM d")} - ${format(
                      new Date(extractedData.endDate),
                      "MMM d, yyyy"
                    )}`
                  : "Unknown"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Opening Balance</p>
              <p className="font-medium">
                {extractedData.openingBalance
                  ? formatCurrency(extractedData.openingBalance)
                  : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Closing Balance</p>
              <p className="font-medium">
                {extractedData.closingBalance
                  ? formatCurrency(extractedData.closingBalance)
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {duplicateCount} potential duplicate{duplicateCount > 1 ? "s" : ""} detected.
                These transactions may already exist in your system.
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 p-0 h-auto"
                  onClick={selectNonDuplicates}
                >
                  Select only non-duplicates
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Selection Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedTransactions.size === extractedData.transactions.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm">
                {selectedCount} of {extractedData.transactions.length} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectNonDuplicates}>
                Select Non-duplicates
              </Button>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedTransactions.size === extractedData.transactions.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
          </div>

          {/* Transactions Table */}
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedData.transactions.map((tx, index) => {
                  const duplicateCheck = duplicateChecks[index];
                  const isDuplicate = duplicateCheck?.isDuplicate || false;

                  return (
                    <TableRow
                      key={index}
                      className={isDuplicate ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedTransactions.has(index)}
                          onCheckedChange={() => toggleTransaction(index)}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {tx.suggestedCategory || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            tx.type === "credit" ? "text-green-600" : "text-red-600"
                          }
                        >
                          {tx.type === "credit" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isDuplicate ? (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <span className="text-xs text-amber-600">Duplicate</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-600">New</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="space-y-4">
          {isImporting && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing transactions...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={onBack} disabled={isImporting}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={selectedCount === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import {selectedCount} Transaction{selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              You are about to import {selectedCount} transaction
              {selectedCount !== 1 ? "s" : ""}.
              {duplicateCount > 0 &&
                ` This includes ${
                  selectedTransactions.size -
                  (extractedData.transactions.length - duplicateCount)
                } potential duplicate${
                  selectedTransactions.size -
                    (extractedData.transactions.length - duplicateCount) !==
                  1
                    ? "s"
                    : ""
                }.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Imported transactions will be created with journal entries for proper
                bookkeeping. You can review and reconcile them later.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title="Import Failed"
        description={errorMessage}
      />
    </>
  );
}