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
} from "lucide-react";
import { toast } from "sonner";
import {
  generateBankStatementUploadUrl,
  processBankStatement,
} from "@/lib/actions/bank-statement-actions";
import { BankStatementReview } from "./bank-statement-review";
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
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
    setProcessedStatement(null);
    setError(null);
    setUploadProgress(0);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Bank Statement</CardTitle>
        <CardDescription>
          Upload a PDF bank statement to import transactions. We&apos;ll automatically extract
          and categorize transactions for you.
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
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="w-12 h-12 text-primary mx-auto" />
              <div className="font-medium">{selectedFile.name}</div>
              <div className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
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
                or click to select a PDF file (max 10MB)
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
            onClick={handleUpload}
            disabled={!selectedFile || !selectedBankAccountId || isUploading || isProcessing}
          >
            {isUploading || isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isUploading ? "Uploading..." : "Processing..."}
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