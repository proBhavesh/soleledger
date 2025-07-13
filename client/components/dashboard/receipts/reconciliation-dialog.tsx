"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar } from "lucide-react";
import type { ReconciliationDialogData } from "@/lib/types/documents";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface ReconciliationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReconciliationDialogData | null;
  onConfirm: (action: ReconciliationAction) => void;
  isLoading?: boolean;
}

export type ReconciliationAction = 
  | { type: "match"; transactionId: string }
  | { type: "skip" };

export function ReconciliationDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  isLoading = false,
}: ReconciliationDialogProps) {
  const [selectedAction, setSelectedAction] = useState<"match" | "skip">("match");
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");

  if (!data) return null;

  const { extractedData, suggestedMatches } = data;
  const hasMatches = suggestedMatches.length > 0;

  const handleConfirm = () => {
    switch (selectedAction) {
      case "match":
        if (selectedTransactionId) {
          onConfirm({ type: "match", transactionId: selectedTransactionId });
        }
        break;
      case "skip":
        onConfirm({ type: "skip" });
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Match Receipt to Transaction</DialogTitle>
          <DialogDescription>
            Review the extracted information and match this receipt to an existing bank transaction.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6">
            {/* Document Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Vendor</span>
                  <span className="font-medium">{extractedData.vendor || "Unknown"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {extractedData.date ? format(new Date(extractedData.date), "MMM d, yyyy") : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-medium">{formatCurrency(extractedData.amount || 0)}</span>
                </div>
                {extractedData.tax && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tax</span>
                    <span className="font-medium">{formatCurrency(extractedData.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Confidence</span>
                  <Badge variant={extractedData.confidence > 0.7 ? "default" : "secondary"}>
                    {Math.round(extractedData.confidence * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            {extractedData.items && extractedData.items.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extractedData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{item.description}</span>
                        <div className="flex items-center gap-2">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          <span className="font-medium">
                            {formatCurrency(item.amount || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Action Selection */}
            <RadioGroup value={selectedAction} onValueChange={(value) => setSelectedAction(value as "match" | "skip")}>
              <div className="space-y-4">
                {/* Match with existing transaction */}
                {hasMatches ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="match" id="match" />
                      <Label htmlFor="match" className="font-medium">
                        Match with existing transaction
                      </Label>
                    </div>
                    {selectedAction === "match" && (
                      <div className="ml-6 space-y-2">
                        {suggestedMatches.map((match) => (
                          <Card
                            key={match.transaction.id}
                            className={`cursor-pointer transition-colors ${
                              selectedTransactionId === match.transaction.id
                                ? "border-primary"
                                : "hover:border-muted-foreground/50"
                            }`}
                            onClick={() => setSelectedTransactionId(match.transaction.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">
                                    {match.transaction.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(match.transaction.date, "MMM d, yyyy")}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {formatCurrency(match.transaction.amount)}
                                  </p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {Math.round(match.confidence * 100)}% match
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <p className="text-sm text-orange-800">
                          No matching bank transactions found for this receipt. 
                          This might happen if:
                        </p>
                        <ul className="text-sm text-orange-700 mt-2 list-disc list-inside space-y-1">
                          <li>The bank transaction hasn&apos;t been imported yet</li>
                          <li>The amount or date differs significantly</li>
                          <li>The transaction was already matched to another receipt</li>
                        </ul>
                        <p className="text-sm text-orange-800 mt-3">
                          You can skip this receipt and match it later once the bank transaction is available.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Skip for now */}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="font-medium">
                    Skip reconciliation
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (selectedAction === "match" && !selectedTransactionId)
            }
          >
            {isLoading ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}