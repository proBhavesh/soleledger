"use client";

import {
  CheckCircle2,
  ClockIcon,
  MoreHorizontal,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import type { RecentDocument } from "@/lib/types/documents";

interface ReceiptsTableProps {
  documents: RecentDocument[];
  onRefresh?: () => void;
}

export function ReceiptsTable({ documents }: ReceiptsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return <FileTextIcon className="h-5 w-5 text-red-500" />;
    }
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType.includes("document")) {
      return <FileIcon className="h-5 w-5 text-blue-700" />;
    }
    return <Receipt className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      COMPLETED: {
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-800",
        label: "Processed",
      },
      PROCESSING: {
        icon: ClockIcon,
        className: "bg-amber-100 text-amber-800",
        label: "Processing",
      },
      FAILED: {
        icon: ClockIcon,
        className: "bg-red-100 text-red-800",
        label: "Failed",
      },
      PENDING: {
        icon: ClockIcon,
        className: "bg-amber-100 text-amber-800",
        label: "Pending",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      >
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Type</TableHead>
            <TableHead className="w-[110px]">Date</TableHead>
            <TableHead>Vendor/Title</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No receipts uploaded yet. Upload your first receipt to get
                started.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{getFileIcon(doc.type)}</TableCell>
                <TableCell>
                  {doc.extractedAmount && formatDate(doc.createdAt)}
                </TableCell>
                <TableCell className="font-medium">
                  {doc.extractedVendor || doc.name}
                </TableCell>
                <TableCell className="text-right">
                  {doc.extractedAmount
                    ? formatCurrency(doc.extractedAmount)
                    : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(doc.processingStatus)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <EyeIcon className="mr-2 h-4 w-4" />
                          View
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={doc.url}
                          download={doc.name}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </DropdownMenuItem>
                      {doc.processingStatus === "PENDING" && (
                        <DropdownMenuItem>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as processed
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>Edit details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
