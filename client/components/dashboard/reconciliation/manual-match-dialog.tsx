"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Calendar,
  DollarSign,
  Building,
  Search,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getAvailableDocuments,
  manuallyMatchTransaction,
} from "@/lib/actions/reconciliation-actions";
import type { ManualMatchDialogProps, AvailableDocument } from "@/lib/types/reconciliation";

export function ManualMatchDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: ManualMatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [documents, setDocuments] = useState<AvailableDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("suggested");

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const result = await getAvailableDocuments(
        transaction.date,
        transaction.amount
      );
      if (result.success && result.data) {
        setDocuments(result.data);
      } else {
        toast.error("Failed to load available documents");
      }
    } catch {
      toast.error("Failed to load available documents");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available documents when dialog opens
  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open, transaction.date, transaction.amount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMatch = async () => {
    if (!selectedDocument) {
      toast.error("Please select a document to match");
      return;
    }

    try {
      setIsMatching(true);
      const result = await manuallyMatchTransaction(
        transaction.id,
        selectedDocument,
        notes
      );

      if (result.success) {
        toast.success("Transaction matched successfully");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to match transaction");
      }
    } catch {
      toast.error("Failed to match transaction");
    } finally {
      setIsMatching(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "CAD",
    }).format(Math.abs(amount));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM dd, yyyy");
  };

  const getMatchBadge = (score?: number) => {
    if (!score) return null;
    
    if (score >= 0.8) {
      return <Badge className="bg-green-100 text-green-800">High Match</Badge>;
    } else if (score >= 0.5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Good Match</Badge>;
    } else if (score > 0) {
      return <Badge className="bg-orange-100 text-orange-800">Possible Match</Badge>;
    }
    return null;
  };

  const filteredDocuments = documents.filter((doc) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(searchLower) ||
      doc.extractedVendor?.toLowerCase().includes(searchLower) ||
      doc.type.toLowerCase().includes(searchLower)
    );
  });

  const suggestedDocuments = filteredDocuments.filter((doc) => doc.matchScore && doc.matchScore > 0);
  const allDocuments = filteredDocuments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manually Match Transaction</DialogTitle>
          <DialogDescription>
            Select a document to match with this transaction
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Details */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{formatDate(transaction.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Amount:</span>
                <span>{formatCurrency(transaction.amount)}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Description:</span>
                <span>{transaction.description || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggested">
                Suggested Matches ({suggestedDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Documents ({allDocuments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suggested" className="mt-4">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : suggestedDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No suggested matches found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestedDocuments.map((doc) => (
                      <Card
                        key={doc.id}
                        className={`cursor-pointer transition-colors ${
                          selectedDocument === doc.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedDocument(doc.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-sm">
                                  {doc.name}
                                </span>
                                {getMatchBadge(doc.matchScore)}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                <div>
                                  <span className="font-medium">Vendor:</span>{" "}
                                  {doc.extractedVendor || "N/A"}
                                </div>
                                <div>
                                  <span className="font-medium">Amount:</span>{" "}
                                  {doc.extractedAmount
                                    ? formatCurrency(doc.extractedAmount)
                                    : "N/A"}
                                </div>
                                <div>
                                  <span className="font-medium">Date:</span>{" "}
                                  {formatDate(doc.extractedDate)}
                                </div>
                              </div>
                            </div>
                            {selectedDocument === doc.id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : allDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allDocuments.map((doc) => (
                      <Card
                        key={doc.id}
                        className={`cursor-pointer transition-colors ${
                          selectedDocument === doc.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedDocument(doc.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-sm">
                                  {doc.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.type}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                <div>
                                  <span className="font-medium">Vendor:</span>{" "}
                                  {doc.extractedVendor || "N/A"}
                                </div>
                                <div>
                                  <span className="font-medium">Amount:</span>{" "}
                                  {doc.extractedAmount
                                    ? formatCurrency(doc.extractedAmount)
                                    : "N/A"}
                                </div>
                                <div>
                                  <span className="font-medium">Date:</span>{" "}
                                  {formatDate(doc.extractedDate)}
                                </div>
                              </div>
                            </div>
                            {selectedDocument === doc.id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this match..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMatching}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!selectedDocument || isMatching}
          >
            {isMatching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Matching...
              </>
            ) : (
              "Match Transaction"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}