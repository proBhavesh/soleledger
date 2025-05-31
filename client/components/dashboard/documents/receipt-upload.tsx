"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  FileImage,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  generateUploadUrl,
  processDocument,
} from "@/lib/actions/document-actions";
import type { ProcessResult } from "@/lib/types/documents";

interface FileUpload {
  id: string;
  file: File;
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  result?: ProcessResult["data"];
}

interface ReceiptUploadProps {
  onUploadComplete?: (result: ProcessResult["data"]) => void;
  maxFiles?: number;
}

export function ReceiptUpload({
  onUploadComplete,
  maxFiles = 10,
}: ReceiptUploadProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);

  const processFile = useCallback(
    async (upload: FileUpload) => {
      try {
        // Update status to uploading
        setUploads((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, progress: 10 } : u))
        );

        // Step 1: Get presigned URL
        const uploadResult = await generateUploadUrl({
          fileName: upload.file.name,
          fileType: upload.file.type,
          fileSize: upload.file.size,
        });

        if (!uploadResult.success || !uploadResult.data) {
          throw new Error(uploadResult.error || "Failed to get upload URL");
        }

        const presignedData = uploadResult.data;

        // Update progress
        setUploads((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, progress: 30 } : u))
        );

        // Step 2: Upload to S3
        const uploadResponse = await fetch(presignedData.uploadUrl, {
          method: "PUT",
          body: upload.file,
          headers: {
            "Content-Type": upload.file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        // Update progress and status
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? { ...u, progress: 60, status: "processing" }
              : u
          )
        );

        // Step 3: Process with AI
        const processResult = await processDocument({
          fileUrl: presignedData.fileUrl,
          fileKey: presignedData.fileKey,
          fileName: upload.file.name,
          fileType: upload.file.type,
          fileSize: upload.file.size,
        });

        if (processResult.success && processResult.data) {
          // Success
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? {
                    ...u,
                    progress: 100,
                    status: "completed",
                    result: processResult.data,
                  }
                : u
            )
          );

          toast.success(`Receipt processed successfully: ${upload.file.name}`);
          onUploadComplete?.(processResult.data);
        } else {
          throw new Error(processResult.error || "Processing failed");
        }
      } catch (error) {
        console.error("Upload error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? { ...u, status: "error", error: errorMessage }
              : u
          )
        );

        toast.error(`Failed to process ${upload.file.name}: ${errorMessage}`);
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newUploads: FileUpload[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        status: "uploading",
        progress: 0,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Process each file
      for (const upload of newUploads) {
        await processFile(upload);
      }
    },
    [processFile]
  );

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop receipts and invoices here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload receipts, invoices, and financial documents (JPEG, PNG,
                  WebP, PDF up to 10MB)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Other document types will be automatically detected and
                  filtered
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Upload Progress</h3>
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div key={upload.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {upload.file.type.startsWith("image/") ? (
                        <FileImage className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm font-medium truncate max-w-48">
                        {upload.file.name}
                      </span>
                      <Badge
                        variant={
                          upload.status === "completed"
                            ? "default"
                            : upload.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {upload.status === "uploading" && "Uploading"}
                        {upload.status === "processing" && "Processing"}
                        {upload.status === "completed" && "Completed"}
                        {upload.status === "error" && "Error"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      {upload.status === "completed" && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {upload.status === "error" && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(upload.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {upload.status !== "error" && (
                    <Progress value={upload.progress} className="h-2" />
                  )}

                  {upload.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{upload.error}</AlertDescription>
                    </Alert>
                  )}

                  {upload.result && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {upload.result.extractedData.confidence === 0 ? (
                        <div className="text-orange-600">
                          <p className="font-medium">
                            ⚠️ Non-receipt document detected
                          </p>
                          <p>
                            {upload.result.extractedData.notes ||
                              "This doesn't appear to be a receipt or invoice"}
                          </p>
                        </div>
                      ) : upload.result.extractedData.confidence < 0.5 ? (
                        <div className="text-yellow-600">
                          <p className="font-medium">
                            ⚠️ Low confidence extraction
                          </p>
                          <p>
                            <span className="font-medium">Vendor:</span>{" "}
                            {upload.result.extractedData.vendor || "Unknown"}
                          </p>
                          <p>
                            <span className="font-medium">Amount:</span> $
                            {upload.result.extractedData.amount?.toFixed(2) ||
                              "0.00"}
                          </p>
                          <p className="text-xs mt-1">
                            Low confidence (
                            {Math.round(
                              upload.result.extractedData.confidence * 100
                            )}
                            %) - Please verify manually
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p>
                            <span className="font-medium">Vendor:</span>{" "}
                            {upload.result.extractedData.vendor || "Unknown"}
                          </p>
                          <p>
                            <span className="font-medium">Amount:</span> $
                            {upload.result.extractedData.amount?.toFixed(2) ||
                              "0.00"}
                          </p>
                          <p>
                            <span className="font-medium">Matches:</span>{" "}
                            {upload.result.matches.length} potential transaction
                            {upload.result.matches.length !== 1 ? "s" : ""}
                          </p>
                          {upload.result.extractedData.confidence < 0.8 && (
                            <p className="text-xs mt-1 text-yellow-600">
                              Confidence:{" "}
                              {Math.round(
                                upload.result.extractedData.confidence * 100
                              )}
                              %
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
