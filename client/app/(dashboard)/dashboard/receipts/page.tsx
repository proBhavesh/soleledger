"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, UploadIcon } from "lucide-react";
import { getRecentDocuments } from "@/lib/actions/document-actions";
import type { RecentDocument } from "@/lib/types/documents";
import { toast } from "sonner";

// Import our new organized components
import { ReceiptsUpload } from "@/components/dashboard/receipts/receipts-upload";
import { ReceiptsTable } from "@/components/dashboard/receipts/receipts-table";
import { ReceiptsGrid } from "@/components/dashboard/receipts/receipts-grid";
import { ReceiptsFilters } from "@/components/dashboard/receipts/receipts-filters";

export default function ReceiptsPage() {
  const [documents, setDocuments] = useState<RecentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const result = await getRecentDocuments();
      if (result.success && result.data) {
        setDocuments(result.data.documents);
      } else {
        console.error("Error fetching documents:", result.error);
        toast.error("Failed to fetch documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadComplete = () => {
    // Refresh the documents list
    fetchDocuments();
    toast.success("Document uploaded and processed successfully!");
  };

  const handleUploadClick = () => {
    setShowUpload(true);
    // Scroll to upload section
    setTimeout(() => {
      uploadRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Filter documents based on search and status
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.extractedVendor?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false);

    const matchesStatus =
      statusFilter === "all" || doc.processingStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Separate receipts from other documents
  const receipts = filteredDocuments.filter(
    (doc) => doc.extractedAmount !== undefined && doc.extractedAmount !== null
  );

  const otherDocuments = filteredDocuments.filter(
    (doc) => doc.extractedAmount === undefined || doc.extractedAmount === null
  );

  const pendingDocuments = filteredDocuments.filter(
    (doc) =>
      doc.processingStatus === "PENDING" ||
      doc.processingStatus === "PROCESSING"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Receipts & Documents
          </h1>
          <p className="text-muted-foreground">
            Manage your receipts, invoices, and important documents with AI
            processing
          </p>
        </div>
        <Button onClick={handleUploadClick}>
          <UploadIcon className="mr-2 h-4 w-4" />
          Upload Documents
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div ref={uploadRef}>
          <Card>
            <CardHeader>
              <CardTitle>Upload Receipts & Documents</CardTitle>
              <CardDescription>
                Our AI will automatically extract data and match receipts to
                your transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReceiptsUpload
                onUploadComplete={handleUploadComplete}
                maxFiles={10}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <ReceiptsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={fetchDocuments}
      />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="receipts">
            Receipts ({receipts.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({otherDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>All Files</CardTitle>
              <CardDescription>
                View all your uploaded receipts and documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">
                      Loading documents...
                    </p>
                  </div>
                </div>
              ) : (
                <ReceiptsTable documents={filteredDocuments} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>
                Manage your expense receipts with AI-powered data extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading receipts...</p>
                  </div>
                </div>
              ) : receipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No receipts yet
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Upload your first receipt to get started with automated data
                    extraction and transaction matching.
                  </p>
                  <Button onClick={handleUploadClick}>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Upload Receipt
                  </Button>
                </div>
              ) : (
                <ReceiptsGrid
                  documents={receipts}
                  onUploadClick={handleUploadClick}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Other Documents</CardTitle>
              <CardDescription>Non-receipt documents and files</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">
                      Loading documents...
                    </p>
                  </div>
                </div>
              ) : otherDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No documents yet
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Documents that aren&apos;t receipts or invoices will appear
                    here.
                  </p>
                  <Button onClick={handleUploadClick}>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Upload Documents
                  </Button>
                </div>
              ) : (
                <ReceiptsGrid
                  documents={otherDocuments}
                  onUploadClick={handleUploadClick}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Review</CardTitle>
              <CardDescription>
                Documents and receipts awaiting processing or review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">
                      Loading pending items...
                    </p>
                  </div>
                </div>
              ) : pendingDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    No documents are pending review. All your uploads have been
                    processed.
                  </p>
                </div>
              ) : (
                <ReceiptsTable documents={pendingDocuments} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
