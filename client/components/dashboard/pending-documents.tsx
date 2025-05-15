"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReceiptIcon } from "lucide-react";

interface PendingDocumentsProps {
  pendingCount: number;
}

export function PendingDocuments({ pendingCount }: PendingDocumentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Documents</CardTitle>
        <CardDescription>
          Receipts and invoices awaiting your attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingCount === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No pending documents</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-center">
                    <ReceiptIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Lunch Receipt</span>
                    <span className="ml-auto font-medium">$32.50</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>No transaction matched</span>
                    <span className="mx-2">•</span>
                    <span>Uploaded Oct 12, 2023</span>
                  </div>
                </div>
              </div>
              <div className="rounded-md border">
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-center">
                    <ReceiptIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Office Equipment Invoice
                    </span>
                    <span className="ml-auto font-medium">$899.99</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>Suggested match found</span>
                    <span className="mx-2">•</span>
                    <span>Uploaded Oct 11, 2023</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
