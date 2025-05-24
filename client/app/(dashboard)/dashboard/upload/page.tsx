"use client";

import { useState, useEffect } from "react";
import { ReceiptUpload } from "@/components/dashboard/documents/receipt-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileImage, FileText, ExternalLink, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getRecentDocuments } from "@/lib/actions/document-actions";
import type { RecentDocument, ProcessResult } from "@/lib/types/documents";

export default function UploadPage() {
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecentDocuments = async () => {
    try {
      setIsLoading(true);
      const result = await getRecentDocuments();
      if (result.success && result.data) {
        setRecentDocuments(result.data.documents);
      } else {
        console.error("Error fetching recent documents:", result.error);
      }
    } catch (error) {
      console.error("Error fetching recent documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentDocuments();
  }, []);

  const handleUploadComplete = (result: ProcessResult["data"]) => {
    // Refresh the recent documents list
    fetchRecentDocuments();
  };

  const getStatusBadge = (status: string) => {
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
    return <Badge variant="secondary">No Matches</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
        <p className="text-muted-foreground">
          Upload receipts, invoices, and other financial documents for automated
          processing
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload New</TabsTrigger>
          <TabsTrigger value="recent">Recent Uploads</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Receipts & Documents</CardTitle>
              <CardDescription>
                Our AI will automatically extract data and match receipts to
                your transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReceiptUpload
                onUploadComplete={handleUploadComplete}
                maxFiles={10}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <FileImage className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">1. Upload Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop receipts, invoices, or PDFs
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">2. AI Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Extract vendor, amount, date, and other details
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <ExternalLink className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">3. Smart Matching</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically link to existing transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Uploads</h2>
              <p className="text-sm text-muted-foreground">
                View and manage your recently uploaded documents
              </p>
            </div>
            <Button onClick={fetchRecentDocuments} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading documents...
              </CardContent>
            </Card>
          ) : recentDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first receipt to get started
                </p>
                <Button
                  onClick={() => {
                    const uploadTab = document.querySelector(
                      '[value="upload"]'
                    ) as HTMLElement;
                    uploadTab?.click();
                  }}
                >
                  Upload Documents
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recentDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {doc.type.startsWith("image/") ? (
                          <FileImage className="h-5 w-5 text-blue-500 mt-0.5" />
                        ) : (
                          <FileText className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(doc.processingStatus)}
                            {doc.matches && getMatchesBadge(doc.matches)}
                          </div>
                          {doc.extractedVendor && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {doc.extractedVendor} • $
                              {doc.extractedAmount?.toFixed(2) || "0.00"}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(doc.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
