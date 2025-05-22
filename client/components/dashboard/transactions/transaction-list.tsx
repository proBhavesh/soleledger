"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SlidersHorizontalIcon,
  TrashIcon,
  CreditCard,
  Home,
  ShoppingBag,
  Coffee,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { Transaction } from "@/lib/types/dashboard";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function TransactionList({
  transactions,
  isLoading,
}: TransactionListProps) {
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(
    new Set()
  );

  // Toggle transaction details
  const toggleTransactionDetails = (id: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTransactions(newExpanded);
  };

  // Get category icon based on category name
  const getCategoryIcon = (category: string) => {
    const normalizedCategory = category.toLowerCase();

    if (
      normalizedCategory.includes("shopping") ||
      normalizedCategory.includes("merchandise")
    ) {
      return <ShoppingBag className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("food") ||
      normalizedCategory.includes("restaurant")
    ) {
      return <ShoppingBag className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("home") ||
      normalizedCategory.includes("rent")
    ) {
      return <Home className="h-4 w-4" />;
    } else if (
      normalizedCategory.includes("coffee") ||
      normalizedCategory.includes("cafe")
    ) {
      return <Coffee className="h-4 w-4" />;
    } else {
      return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Date</TableHead>
            <TableHead className="max-w-[300px]">Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </TableCell>
                </TableRow>
              ))
          ) : transactions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-10 text-muted-foreground"
              >
                No transactions found. Try changing your filters or connect a
                bank account.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction, index) => {
              const isExpanded = expandedTransactions.has(transaction.id);
              const isIncome = transaction.type === "INCOME";
              const isEven = index % 2 === 0;

              return (
                <div key={transaction.id}>
                  <TableRow
                    className={`cursor-pointer ${
                      isEven ? "bg-muted/30" : ""
                    } hover:bg-muted/50 ${isExpanded ? "border-b-0" : ""}`}
                    onClick={() => toggleTransactionDetails(transaction.id)}
                  >
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                        )}
                        {transaction.merchantName || transaction.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {getCategoryIcon(transaction.category)}
                              <span>{transaction.category}</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {transaction.categoryConfidence
                              ? `${Math.round(
                                  transaction.categoryConfidence * 100
                                )}% confidence`
                              : "Category"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      {transaction.accountName || "Unknown"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        isIncome ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">Open menu</span>
                            <SlidersHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Categorize</DropdownMenuItem>
                          <DropdownMenuItem>
                            Mark as reconciled
                          </DropdownMenuItem>
                          <DropdownMenuItem>Add receipt</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <TrashIcon className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow
                      className={`${isEven ? "bg-muted/30" : "bg-muted/10"}`}
                    >
                      <TableCell colSpan={6} className="py-2 px-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {transaction.originalDescription && (
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                                Original Description
                              </h4>
                              <p className="text-sm">
                                {transaction.originalDescription}
                              </p>
                            </div>
                          )}
                          {transaction.locationCity && (
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                                Location
                              </h4>
                              <p className="text-sm">
                                {transaction.locationCity}
                                {transaction.locationRegion &&
                                  `, ${transaction.locationRegion}`}
                              </p>
                            </div>
                          )}
                          {transaction.subcategory && (
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                                Subcategory
                              </h4>
                              <p className="text-sm">
                                {transaction.subcategory}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </div>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
