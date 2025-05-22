"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, Loader2 } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Calculate start and end items on current page
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </div>
        ) : totalItems > 0 ? (
          <>
            Showing <strong>{startItem}</strong> to <strong>{endItem}</strong>{" "}
            of <strong>{totalItems}</strong> transactions
          </>
        ) : (
          "No transactions found"
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
        >
          {isLoading && currentPage > 1 ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
          )}
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
        >
          Next
          {isLoading && currentPage < totalPages ? (
            <Loader2 className="h-4 w-4 ml-1 animate-spin" />
          ) : (
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          )}
        </Button>
      </div>
    </div>
  );
}
