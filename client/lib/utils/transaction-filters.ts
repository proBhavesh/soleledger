/**
 * Utility functions for transaction filter operations
 */

import type { TransactionFilterValues } from "@/lib/types/dashboard";

/**
 * Build filter object from component state
 * This centralizes the filter building logic to avoid duplication
 */
export function buildFilterObject(
  selectedCategory: string,
  searchTerm: string,
  dateRange: { from?: Date; to?: Date } | undefined,
  selectedAccount: string,
  selectedType: string,
  minAmount: string,
  maxAmount: string
): Record<string, string | undefined> {
  return {
    category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
    search: searchTerm || undefined,
    dateFrom: dateRange?.from
      ? formatDateForFilter(dateRange.from)
      : undefined,
    dateTo: dateRange?.to 
      ? formatDateForFilter(dateRange.to)
      : undefined,
    accountId: selectedAccount && selectedAccount !== "all" ? selectedAccount : undefined,
    type: selectedType && selectedType !== "ALL" ? selectedType : undefined,
    minAmount: minAmount || undefined,
    maxAmount: maxAmount || undefined,
  };
}

/**
 * Format date for filter (YYYY-MM-DD format)
 */
export function formatDateForFilter(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse filter values from URL search params
 */
export function parseFiltersFromSearchParams(params: URLSearchParams): TransactionFilterValues {
  const filters: TransactionFilterValues = {};
  
  const search = params.get("search");
  if (search) filters.search = search;
  
  const category = params.get("category");
  if (category && category !== "all") filters.category = category;
  
  const accountId = params.get("accountId");
  if (accountId && accountId !== "all") filters.accountId = accountId;
  
  const type = params.get("type");
  if (type && type !== "ALL") filters.type = type as "INCOME" | "EXPENSE";
  
  const minAmount = params.get("min");
  if (minAmount) filters.minAmount = parseFloat(minAmount);
  
  const maxAmount = params.get("max");
  if (maxAmount) filters.maxAmount = parseFloat(maxAmount);
  
  const fromDate = params.get("from");
  const toDate = params.get("to");
  if (fromDate || toDate) {
    filters.dateRange = {
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined,
    };
  }
  
  return filters;
}

/**
 * Convert filter values to URL search params
 */
export function filtersToSearchParams(filters: TransactionFilterValues): Record<string, string | null> {
  return {
    search: filters.search || null,
    category: filters.category || null,
    accountId: filters.accountId || null,
    from: filters.dateRange?.from ? formatDateForFilter(filters.dateRange.from) : null,
    to: filters.dateRange?.to ? formatDateForFilter(filters.dateRange.to) : null,
    type: filters.type || null,
    min: filters.minAmount ? String(filters.minAmount) : null,
    max: filters.maxAmount ? String(filters.maxAmount) : null,
  };
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}