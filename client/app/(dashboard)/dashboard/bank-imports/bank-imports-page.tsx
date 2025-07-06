"use client";

import { useState, useEffect } from "react";
import { BankStatementUpload } from "@/components/dashboard/banking/bank-statement-upload";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getBankStatementHistory } from "@/lib/actions/bank-statement-actions";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BankAccount } from "@/lib/types/dashboard";
import type { ImportHistory, ProcessingStatus } from "@/lib/types/bank-imports";

interface BankImportsPageProps {
  bankAccounts: BankAccount[];
  error: string | null;
}

/**
 * Bank Imports Page Component
 * Handles manual bank statement uploads and displays import history
 */
export function BankImportsPage({ bankAccounts, error }: BankImportsPageProps) {
  const [activeTab, setActiveTab] = useState("upload");
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchImportHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await getBankStatementHistory();
      if (result.success && result.data) {
        setImportHistory(result.data);
      } else {
        setHistoryError(result.error || "Failed to load import history");
      }
    } catch (error) {
      console.error("Failed to fetch import history:", error);
      setHistoryError("An unexpected error occurred while loading import history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchImportHistory();
    }
  }, [activeTab]);

  const handleUploadSuccess = () => {
    // Show success message or refresh data
    if (activeTab === "history") {
      fetchImportHistory();
    }
  };

  const getStatusBadge = (status: ProcessingStatus) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="default">Completed</Badge>;
      case "PROCESSING":
        return <Badge variant="secondary">Processing</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      default:
        // TypeScript exhaustiveness check
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustive: never = status;
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Statement Imports</h1>
        <p className="text-muted-foreground">
          Upload bank statements to import transactions
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Statement</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Bank Statement</CardTitle>
              <CardDescription>
                Upload a PDF bank statement to extract and import transactions.
                The AI will automatically identify transactions and suggest categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No bank accounts found. Please connect a bank account first.
                  </AlertDescription>
                </Alert>
              ) : (
                <BankStatementUpload
                  bankAccounts={bankAccounts}
                  onSuccess={handleUploadSuccess}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>
                View your recent bank statement imports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{historyError}</AlertDescription>
                </Alert>
              ) : historyLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading import history...
                </div>
              ) : importHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bank statements imported yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {format(new Date(item.uploadedAt), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          {item.transactionCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}