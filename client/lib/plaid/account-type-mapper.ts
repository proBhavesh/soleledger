import { BankAccountType } from "@/lib/types/bank-accounts";

/**
 * Maps Plaid account types and subtypes to our BankAccountType enum
 * Reference: https://plaid.com/docs/api/accounts/#account-type-schema
 */
export function mapPlaidAccountType(
  plaidType: string | null | undefined,
  plaidSubtype: string | null | undefined
): BankAccountType {
  // Handle null/undefined
  if (!plaidType) {
    return BankAccountType.CHECKING;
  }

  const type = plaidType.toLowerCase();
  const subtype = plaidSubtype?.toLowerCase() || "";

  // Investment accounts - not supported, default to CHECKING
  if (type === "investment" || type === "brokerage") {
    return BankAccountType.CHECKING;
  }

  // Depository accounts
  if (type === "depository") {
    if (subtype.includes("savings")) {
      return BankAccountType.SAVINGS;
    }
    if (subtype.includes("checking")) {
      return BankAccountType.CHECKING;
    }
    if (subtype.includes("money market")) {
      return BankAccountType.SAVINGS;
    }
    if (subtype.includes("cd")) {
      return BankAccountType.SAVINGS;
    }
    // Default depository to checking
    return BankAccountType.CHECKING;
  }

  // Credit accounts
  if (type === "credit") {
    if (subtype.includes("credit card")) {
      return BankAccountType.CREDIT_CARD;
    }
    // Other credit types could be line of credit
    return BankAccountType.LINE_OF_CREDIT;
  }

  // Loan accounts
  if (type === "loan") {
    if (subtype.includes("line of credit")) {
      return BankAccountType.LINE_OF_CREDIT;
    }
    // All other loan types (auto, home, student, etc.)
    return BankAccountType.LOAN;
  }

  // Default fallback
  return BankAccountType.CHECKING;
}

/**
 * Get a user-friendly account type label from Plaid types
 */
export function getAccountTypeLabel(
  plaidType: string | null | undefined,
  plaidSubtype: string | null | undefined
): string {
  if (!plaidType) return "Account";

  const type = plaidType.toLowerCase();
  const subtype = plaidSubtype?.toLowerCase() || "";

  // Build a readable label
  if (subtype) {
    // Clean up common patterns
    return subtype
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Fallback to type
  return type.charAt(0).toUpperCase() + type.slice(1);
}