"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  FilterIcon,
  DownloadIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CreditCard,
  Home,
  ShoppingBag,
  Coffee,
  CalendarIcon,
} from "lucide-react";

interface TransactionsHeaderProps {
  title: string;
  description: string;
  onSearch: (term: string) => void;
  onRefresh: () => void;
  onFilter: (category: string) => void;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
  categories: string[];
  selectedCategory: string;
  searchTerm: string;
  isLoading: boolean;
  dateRange?: DateRange;
}

export function TransactionsHeader({
  title,
  description,
  onSearch,
  onRefresh,
  onFilter,
  onDateRangeChange,
  categories,
  selectedCategory,
  searchTerm,
  isLoading,
  dateRange,
}: TransactionsHeaderProps) {
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [date, setDate] = useState<DateRange | undefined>(dateRange);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearchSubmit = () => {
    onSearch(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  {selectedCategory ? `Filter: ${selectedCategory}` : "Filter"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onFilter("")}>
                  All Categories
                </DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => onFilter(category)}
                    className="flex items-center"
                  >
                    {getCategoryIcon(category)}
                    <span className="ml-2">{category}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    "Date Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={(range) => {
                    setDate(range);
                    if (onDateRangeChange) {
                      onDateRangeChange(range);
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
          <Input
            type="search"
            placeholder="Search transactions..."
            className="h-9"
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            onClick={handleSearchSubmit}
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
