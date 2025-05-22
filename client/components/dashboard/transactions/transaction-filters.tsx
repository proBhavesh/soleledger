"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  FilterIcon,
  SearchIcon,
  CalendarIcon,
  TagIcon,
  XIcon,
  WalletIcon,
  BanknoteIcon,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { TransactionFilterValues } from "@/lib/types/dashboard";

// Re-export the type for easier imports
export type { TransactionFilterValues };

// Transaction type enum to avoid 'any' type
type TransactionType = "INCOME" | "EXPENSE" | "ALL";

interface TransactionFiltersProps {
  categories: string[];
  accounts: { id: string; name: string }[];
  onFiltersChange: (filters: TransactionFilterValues) => void;
  className?: string;
}

export function TransactionFilters({
  categories,
  accounts,
  onFiltersChange,
  className,
}: TransactionFiltersProps) {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedType, setSelectedType] = useState<TransactionType>("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Update active filters display wrapped in useCallback to avoid recreating on every render
  const updateActiveFilters = useCallback(
    (
      search: string,
      category: string,
      accountId: string,
      fromDate: string | null,
      toDate: string | null,
      type: TransactionType,
      min: string,
      max: string
    ) => {
      const filters: string[] = [];

      if (search) filters.push(`Search: ${search}`);
      if (category) filters.push(`Category: ${category}`);
      if (accountId) {
        const account = accounts.find((a) => a.id === accountId);
        if (account) filters.push(`Account: ${account.name}`);
      }
      if (fromDate && toDate) {
        filters.push(
          `Date: ${format(new Date(fromDate), "MM/dd/yyyy")} - ${format(
            new Date(toDate),
            "MM/dd/yyyy"
          )}`
        );
      } else if (fromDate) {
        filters.push(`From: ${format(new Date(fromDate), "MM/dd/yyyy")}`);
      } else if (toDate) {
        filters.push(`To: ${format(new Date(toDate), "MM/dd/yyyy")}`);
      }
      if (type && type !== "ALL") filters.push(`Type: ${type.toLowerCase()}`);
      if (min) filters.push(`Min: $${min}`);
      if (max) filters.push(`Max: $${max}`);

      setActiveFilters(filters);
    },
    [accounts]
  );

  // Initialize filters from URL on first load
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const accountId = searchParams.get("accountId") || "";
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const type = (searchParams.get("type") as TransactionType) || "ALL";
    const min = searchParams.get("min") || "";
    const max = searchParams.get("max") || "";

    setSearchInput(search);
    setSelectedCategory(category);
    setSelectedAccount(accountId);
    setSelectedType(type);
    setMinAmount(min);
    setMaxAmount(max);

    if (fromDate || toDate) {
      setDateRange({
        from: fromDate ? new Date(fromDate) : undefined,
        to: toDate ? new Date(toDate) : undefined,
      });
    }

    // Update active filters badges
    updateActiveFilters(
      search,
      category,
      accountId,
      fromDate,
      toDate,
      type,
      min,
      max
    );
  }, [searchParams, updateActiveFilters]);

  // Apply all filters
  const applyFilters = () => {
    const filters: TransactionFilterValues = {};

    if (searchInput) filters.search = searchInput;
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedAccount) filters.accountId = selectedAccount;
    if (dateRange?.from || dateRange?.to) filters.dateRange = dateRange;
    if (selectedType !== "ALL") filters.type = selectedType;
    if (minAmount) filters.minAmount = parseFloat(minAmount);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount);

    onFiltersChange(filters);
    setIsOpen(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput("");
    setSelectedCategory("");
    setSelectedAccount("");
    setDateRange(undefined);
    setSelectedType("ALL");
    setMinAmount("");
    setMaxAmount("");

    onFiltersChange({});
    setIsOpen(false);
  };

  // Handle search input submit
  const handleSearchSubmit = () => {
    const filters: TransactionFilterValues = {};

    if (searchInput) filters.search = searchInput;
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedAccount) filters.accountId = selectedAccount;
    if (dateRange?.from || dateRange?.to) filters.dateRange = dateRange;
    if (selectedType !== "ALL") filters.type = selectedType;
    if (minAmount) filters.minAmount = parseFloat(minAmount);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount);

    onFiltersChange(filters);
  };

  // Handle key press in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  // Remove a single filter
  const removeFilter = (filter: string) => {
    const filterType = filter.split(":")[0].trim().toLowerCase();

    switch (filterType) {
      case "search":
        setSearchInput("");
        break;
      case "category":
        setSelectedCategory("");
        break;
      case "account":
        setSelectedAccount("");
        break;
      case "date":
      case "from":
      case "to":
        setDateRange(undefined);
        break;
      case "type":
        setSelectedType("ALL");
        break;
      case "min":
        setMinAmount("");
        break;
      case "max":
        setMaxAmount("");
        break;
    }

    // Update filters after removing one
    const filters: TransactionFilterValues = {};
    if (filterType !== "search" && searchInput) filters.search = searchInput;
    if (filterType !== "category" && selectedCategory)
      filters.category = selectedCategory;
    if (filterType !== "account" && selectedAccount)
      filters.accountId = selectedAccount;
    if (
      !["date", "from", "to"].includes(filterType) &&
      (dateRange?.from || dateRange?.to)
    ) {
      filters.dateRange = dateRange;
    }
    if (filterType !== "type" && selectedType !== "ALL")
      filters.type = selectedType;
    if (filterType !== "min" && minAmount)
      filters.minAmount = parseFloat(minAmount);
    if (filterType !== "max" && maxAmount)
      filters.maxAmount = parseFloat(maxAmount);

    onFiltersChange(filters);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Input
            type="search"
            placeholder="Search transactions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 h-9"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-9 px-3"
            onClick={handleSearchSubmit}
          >
            <SearchIcon className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </div>

        {/* Filter Button and Popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <FilterIcon className="h-4 w-4 mr-2" />
              Filters
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-4" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Transaction Filters</h4>

              {/* Category filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center">
                  <TagIcon className="h-3 w-3 mr-1" />
                  Category
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center">
                  <WalletIcon className="h-3 w-3 mr-1" />
                  Account
                </label>
                <Select
                  value={selectedAccount}
                  onValueChange={setSelectedAccount}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from &&
                          !dateRange?.to &&
                          "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from || dateRange?.to ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from || new Date(), "LLL dd, y")}{" "}
                            - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from || new Date(), "LLL dd, y")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Transaction type filter */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center">
                  <BanknoteIcon className="h-3 w-3 mr-1" />
                  Transaction Type
                </label>
                <Select
                  value={selectedType}
                  onValueChange={(value) =>
                    setSelectedType(value as TransactionType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount range filters */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center">
                  <DollarIcon className="h-3 w-3 mr-1" />
                  Amount Range
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button size="sm" onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {filter}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full p-0 ml-1"
                onClick={() => removeFilter(filter)}
              >
                <XIcon className="h-3 w-3" />
                <span className="sr-only">Remove {filter} filter</span>
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs py-0 px-2"
            onClick={clearFilters}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}

// Custom icon component to avoid error
function DollarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}
