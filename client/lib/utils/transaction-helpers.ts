/**
 * Utility functions for transaction operations
 */

import { FiCreditCard, FiHome, FiShoppingBag, FiCoffee } from "react-icons/fi";

/**
 * Get the appropriate icon for a transaction category
 */
export function getCategoryIcon(category: string) {
  const normalizedCategory = category.toLowerCase();
  
  if (
    normalizedCategory.includes("shopping") ||
    normalizedCategory.includes("merchandise")
  ) {
    return FiShoppingBag;
  } else if (
    normalizedCategory.includes("food") ||
    normalizedCategory.includes("restaurant")
  ) {
    return FiShoppingBag;
  } else if (
    normalizedCategory.includes("home") ||
    normalizedCategory.includes("rent")
  ) {
    return FiHome;
  } else if (
    normalizedCategory.includes("coffee") ||
    normalizedCategory.includes("cafe")
  ) {
    return FiCoffee;
  } else {
    return FiCreditCard;
  }
}

/**
 * Format transaction amount with proper sign
 */
export function formatTransactionAmount(amount: number, type: "INCOME" | "EXPENSE" | "TRANSFER"): string {
  const sign = type === "INCOME" ? "+" : "-";
  return `${sign}${Math.abs(amount).toFixed(2)}`;
}

/**
 * Validate transaction date
 */
export function isValidTransactionDate(date: Date): boolean {
  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const hundredYearsAgo = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
  
  return date >= hundredYearsAgo && date <= oneYearFromNow;
}

/**
 * Get reconciliation status text
 */
export function getReconciliationStatusText(reconciled: boolean): string {
  return reconciled ? "Reconciled" : "Unreconciled";
}

/**
 * Check if transaction can be edited
 */
export function canEditTransaction(transaction: { reconciled?: boolean; pending?: boolean }): boolean {
  // Can't edit reconciled or pending transactions
  return !transaction.reconciled && !transaction.pending;
}

/**
 * Check if transaction can be deleted
 */
export function canDeleteTransaction(transaction: { reconciled?: boolean; pending?: boolean }): boolean {
  // Can't delete reconciled transactions
  return !transaction.reconciled;
}