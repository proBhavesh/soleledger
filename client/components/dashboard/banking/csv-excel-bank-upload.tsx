"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { parseSpreadsheet, formatTransactionData } from "@/lib/utils/csv-excel-parser";
import { bulkImportBankTransactions, validateBulkImportData } from "@/lib/actions/bank-import-actions";
import { ColumnMappingDialog, type ColumnMapping } from "../receipts/column-mapping-dialog";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { ChartOfAccountsSetup } from "@/components/dashboard/chart-of-accounts/chart-of-accounts-setup";
import { useBusinessContext } from "@/lib/contexts/business-context";
import type { ParsedRow } from "@/lib/utils/csv-excel-parser";

interface CsvExcelBankUploadProps {
  file: File;
  bankAccountId: string;
  onComplete?: () => void;
  onRemove?: () => void;
}

export function CsvExcelBankUpload({ 
  file, 
  bankAccountId, 
  onComplete, 
  onRemove 
}: CsvExcelBankUploadProps) {
  const { selectedBusiness } = useBusinessContext();
  const [status, setStatus] = useState<"parsing" | "mapping" | "importing" | "completed" | "error">("parsing");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogData, setErrorDialogData] = useState<{
    title: string;
    description: string;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);
  const [showChartOfAccountsSetup, setShowChartOfAccountsSetup] = useState(false);

  // Parse file on mount
  useEffect(() => {
    const parseFile = async () => {
      try {
        setProgress(10);
        const result = await parseSpreadsheet(file);
        setProgress(50);
        
        if (result.rows.length === 0) {
          throw new Error("No data found in file");
        }
        
        setParsedData(result);
        setStatus("mapping");
        setMappingDialogOpen(true);
        setProgress(100);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to parse file");
        console.error("Parse error:", err);
      }
    };
    
    parseFile();
  }, [file]);

  const handleColumnMapping = useCallback(async (mapping: ColumnMapping) => {
    if (!parsedData) return;
    
    setMappingDialogOpen(false);
    setStatus("importing");
    setProgress(0);
    
    try {
      // Format data according to mapping
      const formattedData = formatTransactionData(parsedData.rows, mapping);
      setProgress(20);
      
      // Validate data
      const validation = await validateBulkImportData(formattedData);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }
      setProgress(40);
      
      // Import transactions
      const result = await bulkImportBankTransactions({
        bankAccountId,
        transactions: formattedData,
      });
      setProgress(90);
      
      if (result.success) {
        setStatus("completed");
        setImportResult({
          success: result.successCount,
          failed: result.failedCount,
          errors: result.errors,
        });
        toast.success(`Successfully imported ${result.successCount} transactions`);
        onComplete?.();
      } else {
        setStatus("error");
        setImportResult({
          success: result.successCount,
          failed: result.failedCount,
          errors: result.errors,
        });
        
        // Check if the error is about Chart of Accounts not being set up
        const chartOfAccountsError = result.errors?.find(err => 
          err.error.includes("Chart of Accounts not set up")
        );
        
        if (chartOfAccountsError) {
          // Show Chart of Accounts setup dialog
          setShowChartOfAccountsSetup(true);
        } else {
          // Show error dialog for other import failures
          const errorTitle = result.successCount === 0 
            ? "Import Failed" 
            : "Import Completed with Errors";
          
          const errorDescription = result.successCount === 0
            ? `All ${result.failedCount} transactions failed to import.`
            : `${result.successCount} transactions imported successfully, but ${result.failedCount} failed.`;
          
          setErrorDialogData({
            title: errorTitle,
            description: errorDescription,
            errors: result.errors,
          });
          setShowErrorDialog(true);
        }
        
        // Only call onComplete if some transactions were successful
        if (result.successCount > 0) {
          onComplete?.();
        }
      }
      setProgress(100);
    } catch (err) {
      setStatus("error");
      const errorMessage = err instanceof Error ? err.message : "Import failed";
      setError(errorMessage);
      console.error("Import error:", err);
      
      // Show error dialog for exceptions
      setErrorDialogData({
        title: "Import Error",
        description: errorMessage,
      });
      setShowErrorDialog(true);
    }
  }, [parsedData, bankAccountId, onComplete]);

  const getStatusMessage = () => {
    switch (status) {
      case "parsing":
        return "Parsing file...";
      case "mapping":
        return "Ready for column mapping";
      case "importing":
        return "Importing transactions...";
      case "completed":
        return `Import completed: ${importResult?.success || 0} transactions imported`;
      case "error":
        return error || "An error occurred";
      default:
        return "";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileSpreadsheet className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{getStatusMessage()}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={status === "importing"}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {(status === "parsing" || status === "importing") && (
            <Progress value={progress} className="h-2 mb-2" />
          )}

          {status === "error" && error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importResult && importResult.errors && importResult.errors.length > 0 && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Import Errors</p>
                <ul className="list-disc list-inside text-xs">
                  {importResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.error}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>... and {importResult.errors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {parsedData && (
        <ColumnMappingDialog
          open={mappingDialogOpen}
          onOpenChange={setMappingDialogOpen}
          headers={parsedData.headers}
          previewRows={parsedData.rows}
          fileName={file.name}
          onConfirm={handleColumnMapping}
          isLoading={status === "importing"}
        />
      )}
      
      {errorDialogData && (
        <ErrorDialog
          open={showErrorDialog}
          onOpenChange={setShowErrorDialog}
          title={errorDialogData.title}
          description={errorDialogData.description}
          errors={errorDialogData.errors}
        />
      )}
      
      {showChartOfAccountsSetup && (
        <Dialog open={showChartOfAccountsSetup} onOpenChange={setShowChartOfAccountsSetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chart of Accounts Required</DialogTitle>
              <DialogDescription>
                Your business needs a Chart of Accounts to import transactions.
              </DialogDescription>
            </DialogHeader>
            {selectedBusiness ? (
              <ChartOfAccountsSetup
                businessId={selectedBusiness.id}
                showAsCard={false}
                onComplete={() => {
                  setShowChartOfAccountsSetup(false);
                  // Reset status to allow retry
                  setStatus("parsing");
                  setError(null);
                }}
              />
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Please select a business first.
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}