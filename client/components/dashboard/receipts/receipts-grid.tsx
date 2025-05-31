"use client";

import {
  MoreHorizontal,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Receipt,
  PlusIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { RecentDocument } from "@/lib/types/documents";

interface ReceiptsGridProps {
  documents: RecentDocument[];
  onUploadClick?: () => void;
}

export function ReceiptsGrid({ documents, onUploadClick }: ReceiptsGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return <FileTextIcon className="h-8 w-8 text-red-500" />;
    }
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    if (mimeType.includes("document")) {
      return <FileIcon className="h-8 w-8 text-blue-700" />;
    }
    return <Receipt className="h-8 w-8 text-green-500" />;
  };

  const getStatusBadge = (
    status: string,
    matches: RecentDocument["matches"]
  ) => {
    // Check if this is a non-receipt document
    const isNonReceipt = matches.length === 0 && status === "COMPLETED";

    if (isNonReceipt) {
      return (
        <Badge variant="outline" className="text-orange-600">
          Non-receipt
        </Badge>
      );
    }

    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Processed</Badge>;
      case "PROCESSING":
        return <Badge variant="secondary">Processing</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getMatchesBadge = (matches: RecentDocument["matches"]) => {
    const confirmedMatches = matches.filter(
      (m) => m.status === "CONFIRMED"
    ).length;
    const suggestedMatches = matches.filter(
      (m) => m.status === "SUGGESTED"
    ).length;

    if (confirmedMatches > 0) {
      return (
        <Badge className="bg-blue-100 text-blue-800">
          {confirmedMatches} Matched
        </Badge>
      );
    } else if (suggestedMatches > 0) {
      return <Badge variant="outline">{suggestedMatches} Suggested</Badge>;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="overflow-hidden">
          <div className="h-32 bg-muted flex items-center justify-center">
            {getFileIcon(doc.type)}
          </div>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">
                  {doc.extractedVendor || doc.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                {getStatusBadge(doc.processingStatus, doc.matches)}
                {getMatchesBadge(doc.matches)}
              </div>
            </div>

            {doc.extractedAmount && (
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-sm">Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(doc.extractedAmount)}
                  </span>
                </div>
                {doc.matches.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Matches:</span>
                    <span className="text-sm">
                      {doc.matches.length} transaction
                      {doc.matches.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(doc.createdAt), {
                  addSuffix: true,
                })}
              </span>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <EyeIcon className="mr-2 h-3.5 w-3.5" />
                    View
                  </a>
                </Button>
                <Button size="sm" variant="ghost" className="px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Upload new receipt card */}
      <Card
        className="overflow-hidden border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onUploadClick}
      >
        <div className="h-32 bg-muted flex items-center justify-center">
          <Button
            variant="ghost"
            className="rounded-full h-16 w-16"
            onClick={onUploadClick}
          >
            <PlusIcon className="h-8 w-8 text-muted-foreground" />
          </Button>
        </div>
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <h3 className="font-medium text-center">Upload New Receipt</h3>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Drag & drop or click to upload
          </p>
          <Button className="mt-3" size="sm" onClick={onUploadClick}>
            <UploadIcon className="mr-2 h-3.5 w-3.5" />
            Upload
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
