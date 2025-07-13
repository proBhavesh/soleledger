"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateBankStatementUploadUrl,
  processBankStatement,
} from "@/lib/actions/bank-statement-actions";
import { BankStatementReview } from "./bank-statement-review";
import { CsvExcelBankUpload } from "./csv-excel-bank-upload";
import type { BankAccount } from "@/lib/types/dashboard";
import type { BankStatementData } from "@/lib/ai/bank-statement-processor";

interface BankStatementUploadProps {
  bankAccounts: BankAccount[];
  onSuccess?: () => void;
}

interface ProcessedStatement {
  documentId: string;
  extractedData: BankStatementData;
  duplicateChecks: Array<{
    isDuplicate: boolean;
    confidence: number;
    matchedTransaction?: {
      id: string;
      date: Date;
      amount: number;
      description: string;
    };
  }>;
}

export function BankStatementUpload({
  bankAccounts,
  onSuccess,
}: BankStatementUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [processedStatement, setProcessedStatement] = useState<ProcessedStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvExcelFile, setCsvExcelFile] = useState<File | null>(null);
  const [showCsvExcelUpload, setShowCsvExcelUpload] = useState(false);

  const isSpreadsheetFile = (file: File): boolean => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    return (
      fileType === "text/csv" ||
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileType === "application/vnd.ms-excel" ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls")
    );
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      if (isSpreadsheetFile(file)) {
        setCsvExcelFile(file);
        setSelectedFile(null);
      } else if (file.type === "application/pdf") {
        setSelectedFile(file);
        setCsvExcelFile(null);
      } else {
        toast.error("Only PDF, CSV, or Excel files are allowed");
        return;
      }
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile || !selectedBankAccountId) {
      toast.error("Please select a file and bank account");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Get presigned URL
      const uploadUrlResult = await generateBankStatementUploadUrl({
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        bankAccountId: selectedBankAccountId,
      });

      if (!uploadUrlResult.success || !uploadUrlResult.data) {
        throw new Error(uploadUrlResult.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileKey, fileUrl } = uploadUrlResult.data;

      // Upload file
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      setUploadProgress(100);
      setIsUploading(false);
      setIsProcessing(true);

      // Process the uploaded file
      const processResult = await processBankStatement({
        fileUrl,
        fileKey,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        bankAccountId: selectedBankAccountId,
      });

      if (!processResult.success || !processResult.data) {
        throw new Error(processResult.error || "Failed to process bank statement");
      }

      setProcessedStatement(processResult.data);
      toast.success("Bank statement processed successfully!");
    } catch (error) {
      console.error("Error uploading bank statement:", error);
      setError(error instanceof Error ? error.message : "Failed to upload bank statement");
      toast.error("Failed to process bank statement");
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCsvExcelFile(null);
    setProcessedStatement(null);
    setError(null);
    setUploadProgress(0);
    setShowCsvExcelUpload(false);
  };

  const handleImportComplete = () => {
    handleReset();
    onSuccess?.();
  };

  // If we have processed data, show the review component
  if (processedStatement) {
    return (
      <BankStatementReview
        documentId={processedStatement.documentId}
        bankAccountId={selectedBankAccountId}
        extractedData={processedStatement.extractedData}
        duplicateChecks={processedStatement.duplicateChecks}
        onBack={handleReset}
        onSuccess={handleImportComplete}
      />
    );
  }

  // If we have a CSV/Excel file and user clicked continue, show the CSV/Excel upload component
  if (csvExcelFile && selectedBankAccountId && showCsvExcelUpload) {
    return (
      <CsvExcelBankUpload
        file={csvExcelFile}
        bankAccountId={selectedBankAccountId}
        onComplete={handleImportComplete}
        onRemove={handleReset}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Bank Statement</CardTitle>
        <CardDescription>
          Upload a bank statement to import transactions. Supported formats:
          PDF (AI extraction), CSV, or Excel files.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bank Account Selection */}
        <div className="space-y-2">
          <Label htmlFor="bank-account">Select Bank Account</Label>
          <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
            <SelectTrigger id="bank-account">
              <SelectValue placeholder="Choose a bank account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <span>{account.name}</span>
                    {account.accountNumber && (
                      <span className="text-sm text-muted-foreground">
                        ({account.accountNumber})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            ${selectedFile ? "bg-muted/50" : ""}
          `}
        >
          <input {...getInputProps()} />
          {selectedFile || csvExcelFile ? (
            <div className="space-y-2">
              {selectedFile ? (
                <FileText className="w-12 h-12 text-primary mx-auto" />
              ) : (
                <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
              )}
              <div className="font-medium">
                {selectedFile?.name || csvExcelFile?.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {((selectedFile?.size || csvExcelFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setCsvExcelFile(null);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
              <div className="font-medium">
                {isDragActive ? "Drop the file here" : "Drop your bank statement here"}
              </div>
              <div className="text-sm text-muted-foreground">
                or click to select a file (PDF, CSV, or Excel - max 10MB)
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Progress */}
        {(isUploading || isProcessing) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{isUploading ? "Uploading..." : "Processing..."}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isUploading || isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (csvExcelFile) {
                // For CSV/Excel files, show the CSV/Excel upload component
                setShowCsvExcelUpload(true);
              } else {
                handleUpload();
              }
            }}
            disabled={(!selectedFile && !csvExcelFile) || !selectedBankAccountId || isUploading || isProcessing}
          >
            {isUploading || isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isUploading ? "Uploading..." : "Processing..."}
              </>
            ) : csvExcelFile ? (
              <>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Continue
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}