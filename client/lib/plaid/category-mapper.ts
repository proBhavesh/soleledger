/**
 * Maps Plaid's personal finance categories to standard Chart of Accounts categories
 * Based on Plaid's PFC (Personal Finance Category) taxonomy
 * 
 * IMPORTANT: All category names MUST match exactly with CHART_OF_ACCOUNTS in
 * /lib/constants/chart-of-accounts.ts to ensure proper database matching.
 */

import { CHART_OF_ACCOUNTS } from '@/lib/constants/chart-of-accounts';

// Extract the exact category names from Chart of Accounts for type safety
type ChartOfAccountCategory = typeof CHART_OF_ACCOUNTS[number]['name'];

// Type definitions for Plaid categories
type PlaidCategory = {
  primary: string;
  detailed: string;
};

/**
 * Maps Plaid's detailed categories to Chart of Accounts categories
 * Using the detailed category provides more accurate mapping
 * 
 * Available Chart of Accounts categories:
 * Income: Sales Revenue, Other Revenue
 * Expenses: Cost of Goods Sold (COGS), Salaries and Wages, Rent Expense, 
 *          Utilities Expense, Office Supplies, Advertising & Marketing,
 *          Travel & Meals, Professional Fees, Insurance Expense,
 *          Depreciation Expense, Miscellaneous Expense, Tax Expense
 */
const PLAID_TO_CHART_OF_ACCOUNTS_MAP: Record<string, ChartOfAccountCategory> = {
  // INCOME mappings
  "INCOME_WAGES": "Sales Revenue",
  "INCOME_INTEREST_EARNED": "Other Revenue",
  "INCOME_DIVIDENDS": "Other Revenue",
  "INCOME_RETIREMENT_PENSION": "Other Revenue",
  "INCOME_TAX_REFUND": "Other Revenue",
  "INCOME_UNEMPLOYMENT": "Other Revenue",
  "INCOME_OTHER_INCOME": "Other Revenue",
  
  // BANK_FEES mappings - Map to Miscellaneous Expense
  "BANK_FEES_ATM_FEES": "Miscellaneous Expense",
  "BANK_FEES_FOREIGN_TRANSACTION_FEES": "Miscellaneous Expense",
  "BANK_FEES_INSUFFICIENT_FUNDS": "Miscellaneous Expense",
  "BANK_FEES_INTEREST_CHARGE": "Miscellaneous Expense",
  "BANK_FEES_OVERDRAFT_FEES": "Miscellaneous Expense",
  "BANK_FEES_OTHER_BANK_FEES": "Miscellaneous Expense",
  
  // ENTERTAINMENT mappings - Map to Travel & Meals
  "ENTERTAINMENT_CASINOS_AND_GAMBLING": "Travel & Meals",
  "ENTERTAINMENT_MUSIC_AND_AUDIO": "Travel & Meals",
  "ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS": "Travel & Meals",
  "ENTERTAINMENT_TV_AND_MOVIES": "Travel & Meals",
  "ENTERTAINMENT_VIDEO_GAMES": "Travel & Meals",
  "ENTERTAINMENT_OTHER_ENTERTAINMENT": "Travel & Meals",
  
  // FOOD_AND_DRINK mappings - Business meals to Travel & Meals
  "FOOD_AND_DRINK_RESTAURANT": "Travel & Meals",
  "FOOD_AND_DRINK_FAST_FOOD": "Travel & Meals",
  "FOOD_AND_DRINK_COFFEE": "Travel & Meals",
  "FOOD_AND_DRINK_TAKEOUT": "Travel & Meals",
  "FOOD_AND_DRINK_ALCOHOL_AND_BARS": "Travel & Meals",
  "FOOD_AND_DRINK_GROCERIES": "Office Supplies", // Office kitchen supplies
  
  // GENERAL_MERCHANDISE mappings
  "GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS": "Office Supplies",
  "GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES": "Miscellaneous Expense",
  "GENERAL_MERCHANDISE_CONVENIENCE_STORES": "Office Supplies",
  "GENERAL_MERCHANDISE_DEPARTMENT_STORES": "Office Supplies",
  "GENERAL_MERCHANDISE_ELECTRONICS": "Office Supplies",
  "GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES": "Miscellaneous Expense",
  "GENERAL_MERCHANDISE_OFFICE_SUPPLIES": "Office Supplies",
  "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES": "Office Supplies",
  "GENERAL_MERCHANDISE_SPORTING_GOODS": "Miscellaneous Expense",
  
  // HOME_IMPROVEMENT mappings
  "HOME_IMPROVEMENT_FURNITURE": "Office Supplies",
  "HOME_IMPROVEMENT_HARDWARE": "Office Supplies",
  "HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE": "Miscellaneous Expense",
  
  // LOAN_PAYMENTS mappings
  "LOAN_PAYMENTS_CAR_PAYMENT": "Miscellaneous Expense",
  "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT": "Miscellaneous Expense",
  "LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT": "Miscellaneous Expense",
  "LOAN_PAYMENTS_MORTGAGE_PAYMENT": "Rent Expense", // For business premises
  "LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT": "Miscellaneous Expense",
  
  // MEDICAL mappings - Map to Insurance Expense
  "MEDICAL_DENTAL_CARE": "Insurance Expense",
  "MEDICAL_EYE_CARE": "Insurance Expense",
  "MEDICAL_NURSING_CARE": "Insurance Expense",
  "MEDICAL_PHARMACIES_AND_SUPPLEMENTS": "Insurance Expense",
  "MEDICAL_PRIMARY_CARE": "Insurance Expense",
  "MEDICAL_VETERINARY_SERVICES": "Miscellaneous Expense",
  
  // PERSONAL_CARE mappings
  "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS": "Miscellaneous Expense",
  "PERSONAL_CARE_HAIR_AND_BEAUTY": "Miscellaneous Expense",
  "PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING": "Miscellaneous Expense",
  
  // GENERAL_SERVICES mappings
  "GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING": "Professional Fees",
  "GENERAL_SERVICES_AUTOMOTIVE": "Miscellaneous Expense",
  "GENERAL_SERVICES_CONSULTING_AND_LEGAL": "Professional Fees",
  "GENERAL_SERVICES_EDUCATION": "Professional Fees",
  "GENERAL_SERVICES_INSURANCE": "Insurance Expense",
  "GENERAL_SERVICES_POSTAGE_AND_SHIPPING": "Office Supplies",
  "GENERAL_SERVICES_STORAGE": "Rent Expense",
  
  // RENT_AND_UTILITIES mappings
  "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY": "Utilities Expense",
  "RENT_AND_UTILITIES_INTERNET_AND_CABLE": "Utilities Expense",
  "RENT_AND_UTILITIES_RENT": "Rent Expense",
  "RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT": "Utilities Expense",
  "RENT_AND_UTILITIES_TELEPHONE": "Utilities Expense",
  "RENT_AND_UTILITIES_WATER": "Utilities Expense",
  
  // TRAVEL mappings
  "TRAVEL_FLIGHTS": "Travel & Meals",
  "TRAVEL_GAS_STATIONS": "Travel & Meals",
  "TRAVEL_HOTELS": "Travel & Meals",
  "TRAVEL_PARKING": "Travel & Meals",
  "TRAVEL_PUBLIC_TRANSIT": "Travel & Meals",
  "TRAVEL_RENTAL_CARS": "Travel & Meals",
  "TRAVEL_TAXIS_AND_RIDE_SHARES": "Travel & Meals",
  
  // TRANSPORTATION mappings
  "TRANSPORTATION_BIKES_AND_SCOOTERS": "Travel & Meals",
  "TRANSPORTATION_GAS_STATIONS": "Travel & Meals",
  "TRANSPORTATION_PARKING": "Travel & Meals",
  "TRANSPORTATION_PUBLIC_TRANSIT": "Travel & Meals",
  "TRANSPORTATION_TAXIS_AND_RIDE_SHARES": "Travel & Meals",
  "TRANSPORTATION_TOLLS": "Travel & Meals",
};

/**
 * Primary category fallback mappings for when detailed category doesn't match
 */
const PRIMARY_CATEGORY_FALLBACK_MAP: Record<string, ChartOfAccountCategory> = {
  "INCOME": "Other Revenue",
  "BANK_FEES": "Miscellaneous Expense",
  "ENTERTAINMENT": "Travel & Meals",
  "FOOD_AND_DRINK": "Travel & Meals",
  "GENERAL_MERCHANDISE": "Office Supplies",
  "HOME_IMPROVEMENT": "Miscellaneous Expense",
  "LOAN_PAYMENTS": "Miscellaneous Expense",
  "MEDICAL": "Insurance Expense",
  "PERSONAL_CARE": "Miscellaneous Expense",
  "GENERAL_SERVICES": "Professional Fees",
  "RENT_AND_UTILITIES": "Utilities Expense",
  "TRAVEL": "Travel & Meals",
  "TRANSPORTATION": "Travel & Meals",
};

/**
 * Maps a Plaid category to a Chart of Accounts category
 * @param plaidCategory - The Plaid category object with primary and detailed fields
 * @returns The corresponding Chart of Accounts category name
 */
export function mapPlaidCategoryToChartOfAccounts(
  plaidCategory: PlaidCategory
): ChartOfAccountCategory {
  // First try to map using the detailed category for more accuracy
  const detailedMapping = PLAID_TO_CHART_OF_ACCOUNTS_MAP[plaidCategory.detailed];
  if (detailedMapping) {
    return detailedMapping;
  }
  
  // Fall back to primary category mapping
  const primaryMapping = PRIMARY_CATEGORY_FALLBACK_MAP[plaidCategory.primary];
  if (primaryMapping) {
    return primaryMapping;
  }
  
  // Default to Miscellaneous Expense if no mapping found
  return "Miscellaneous Expense";
}

/**
 * Maps a Plaid category to determine if it's income or expense
 * @param plaidCategory - The Plaid category object
 * @returns 'INCOME' or 'EXPENSE'
 */
export function getTransactionType(plaidCategory: PlaidCategory): 'INCOME' | 'EXPENSE' {
  // Income categories
  if (plaidCategory.primary === 'INCOME' || plaidCategory.primary === 'TRANSFER_IN') {
    return 'INCOME';
  }
  
  // Everything else is an expense
  return 'EXPENSE';
}

/**
 * Helper function to check if a transaction should be ignored
 * (e.g., internal transfers that shouldn't create journal entries)
 * @param plaidCategory - The Plaid category object
 * @returns true if the transaction should be ignored
 */
export function shouldIgnoreTransaction(plaidCategory: PlaidCategory): boolean {
  // Internal account transfers shouldn't create journal entries
  const ignoredCategories = [
    'TRANSFER_IN_ACCOUNT_TRANSFER',
    'TRANSFER_OUT_ACCOUNT_TRANSFER',
  ];
  
  return ignoredCategories.includes(plaidCategory.detailed);
}

/**
 * Get transaction type from Plaid category
 * @param plaidCategory - The Plaid category object
 * @param merchantName - The merchant name from the transaction
 * @param description - The transaction description
 * @returns Transaction type for journal entry creation
 */
export function getTransactionTypeFromPlaid(
  plaidCategory?: PlaidCategory,
  merchantName?: string | null,
  description?: string
): string {
  if (!plaidCategory) return "other";

  const primary = plaidCategory.primary.toUpperCase();
  const detailed = plaidCategory.detailed?.toUpperCase() || "";
  const desc = description?.toLowerCase() || "";

  // Loan payments
  if (primary === "LOAN_PAYMENTS" || desc.includes("loan payment")) {
    return "loan_payment";
  }

  // Credit card payments
  if (detailed.includes("CREDIT_CARD_PAYMENT") || desc.includes("credit card payment")) {
    return "credit_card_payment";
  }

  // Tax payments
  if (primary === "TAX" || desc.includes("tax payment")) {
    return "tax_payment";
  }

  // Payroll
  if (detailed.includes("PAYROLL") || desc.includes("payroll")) {
    return "payroll";
  }

  // Asset purchases
  if (desc.includes("equipment") || desc.includes("computer") || desc.includes("furniture")) {
    return "asset_purchase";
  }

  // Inventory
  if (desc.includes("inventory") || desc.includes("merchandise")) {
    return "inventory_purchase";
  }

  // Transfers
  if (primary === "TRANSFER_IN" || primary === "TRANSFER_OUT") {
    return "transfer";
  }

  // Income vs expense
  if (["INCOME", "DEPOSIT"].includes(primary)) {
    return "income";
  }

  return "expense";
}

/**
 * Maps common merchant names to more specific Chart of Accounts categories
 * This can be used to override the category mapping based on known merchants
 * 
 * NOTE: All mapped values must exist in CHART_OF_ACCOUNTS
 */
export const MERCHANT_OVERRIDES: Record<string, ChartOfAccountCategory> = {
  // Software and SaaS - Map to Professional Fees
  "GOOGLE": "Professional Fees",
  "AMAZON WEB SERVICES": "Professional Fees",
  "MICROSOFT": "Professional Fees",
  "ADOBE": "Professional Fees",
  "SLACK": "Professional Fees",
  "ZOOM": "Professional Fees",
  "DROPBOX": "Professional Fees",
  "GITHUB": "Professional Fees",
  "QUICKBOOKS": "Professional Fees",
  
  // Marketing
  "FACEBOOK": "Advertising & Marketing",
  "GOOGLE ADS": "Advertising & Marketing",
  "LINKEDIN": "Advertising & Marketing",
  "TWITTER": "Advertising & Marketing",
  
  // Professional Services
  "H&R BLOCK": "Professional Fees",
  "LEGALZOOM": "Professional Fees",
  
  // Utilities and Communication
  "BELL": "Utilities Expense",
  "ROGERS": "Utilities Expense",
  "TELUS": "Utilities Expense",
  "SHAW": "Utilities Expense",
  
  // Office Supplies
  "STAPLES": "Office Supplies",
  "OFFICE DEPOT": "Office Supplies",
  
  // Travel
  "AIR CANADA": "Travel & Meals",
  "WESTJET": "Travel & Meals",
  "UBER": "Travel & Meals",
  "LYFT": "Travel & Meals",
};

/**
 * Enhanced mapping function that considers merchant names
 * @param plaidCategory - The Plaid category object
 * @param merchantName - The merchant name from the transaction
 * @returns The corresponding Chart of Accounts category name
 */
export function mapPlaidCategoryWithMerchant(
  plaidCategory: PlaidCategory,
  merchantName?: string | null
): ChartOfAccountCategory {
  // Check merchant overrides first
  if (merchantName) {
    const upperMerchant = merchantName.toUpperCase();
    for (const [merchant, category] of Object.entries(MERCHANT_OVERRIDES)) {
      if (upperMerchant.includes(merchant)) {
        return category;
      }
    }
  }
  
  // Fall back to regular category mapping
  return mapPlaidCategoryToChartOfAccounts(plaidCategory);
}