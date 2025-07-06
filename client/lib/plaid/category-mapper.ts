/**
 * Maps Plaid's personal finance categories to standard Chart of Accounts categories
 * Based on Plaid's PFC (Personal Finance Category) taxonomy
 */

// Type definitions for better type safety
type PlaidCategory = {
  primary: string;
  detailed: string;
};

type ChartOfAccountCategory = 
  // Income categories
  | "Sales Revenue"
  | "Service Revenue"
  | "Consulting Revenue"
  | "Interest Income"
  | "Other Income"
  // Expense categories
  | "Advertising & Marketing"
  | "Office Supplies"
  | "Professional Fees"
  | "Insurance"
  | "Rent"
  | "Utilities"
  | "Telephone"
  | "Internet"
  | "Software Subscriptions"
  | "Travel"
  | "Meals & Entertainment"
  | "Fuel"
  | "Vehicle Maintenance"
  | "Salaries & Wages"
  | "Interest Expense"
  | "Bank Charges"
  | "Credit Card Fees"
  | "Miscellaneous";

/**
 * Maps Plaid's detailed categories to Chart of Accounts categories
 * Using the detailed category provides more accurate mapping
 */
const PLAID_TO_CHART_OF_ACCOUNTS_MAP: Record<string, ChartOfAccountCategory> = {
  // INCOME mappings
  "INCOME_WAGES": "Service Revenue",
  "INCOME_INTEREST_EARNED": "Interest Income",
  "INCOME_DIVIDENDS": "Other Income",
  "INCOME_RETIREMENT_PENSION": "Other Income",
  "INCOME_TAX_REFUND": "Other Income",
  "INCOME_UNEMPLOYMENT": "Other Income",
  "INCOME_OTHER_INCOME": "Other Income",
  
  // BANK_FEES mappings
  "BANK_FEES_ATM_FEES": "Bank Charges",
  "BANK_FEES_FOREIGN_TRANSACTION_FEES": "Bank Charges",
  "BANK_FEES_INSUFFICIENT_FUNDS": "Bank Charges",
  "BANK_FEES_INTEREST_CHARGE": "Interest Expense",
  "BANK_FEES_OVERDRAFT_FEES": "Bank Charges",
  "BANK_FEES_OTHER_BANK_FEES": "Bank Charges",
  
  // ENTERTAINMENT mappings
  "ENTERTAINMENT_CASINOS_AND_GAMBLING": "Meals & Entertainment",
  "ENTERTAINMENT_MUSIC_AND_AUDIO": "Meals & Entertainment",
  "ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS": "Meals & Entertainment",
  "ENTERTAINMENT_TV_AND_MOVIES": "Meals & Entertainment",
  "ENTERTAINMENT_VIDEO_GAMES": "Meals & Entertainment",
  "ENTERTAINMENT_OTHER_ENTERTAINMENT": "Meals & Entertainment",
  
  // FOOD_AND_DRINK mappings
  "FOOD_AND_DRINK_RESTAURANT": "Meals & Entertainment",
  "FOOD_AND_DRINK_FAST_FOOD": "Meals & Entertainment",
  "FOOD_AND_DRINK_COFFEE": "Meals & Entertainment",
  "FOOD_AND_DRINK_TAKEOUT": "Meals & Entertainment",
  "FOOD_AND_DRINK_ALCOHOL_AND_BARS": "Meals & Entertainment",
  "FOOD_AND_DRINK_GROCERIES": "Miscellaneous", // Could be office supplies if for office
  
  // GENERAL_MERCHANDISE mappings
  "GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS": "Office Supplies",
  "GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES": "Miscellaneous",
  "GENERAL_MERCHANDISE_CONVENIENCE_STORES": "Office Supplies",
  "GENERAL_MERCHANDISE_DEPARTMENT_STORES": "Office Supplies",
  "GENERAL_MERCHANDISE_ELECTRONICS": "Office Supplies",
  "GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES": "Miscellaneous",
  "GENERAL_MERCHANDISE_OFFICE_SUPPLIES": "Office Supplies",
  "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES": "Office Supplies",
  "GENERAL_MERCHANDISE_SPORTING_GOODS": "Miscellaneous",
  
  // HOME_IMPROVEMENT mappings
  "HOME_IMPROVEMENT_FURNITURE": "Office Supplies",
  "HOME_IMPROVEMENT_HARDWARE": "Office Supplies",
  "HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE": "Miscellaneous",
  
  // LOAN_PAYMENTS mappings
  "LOAN_PAYMENTS_CAR_PAYMENT": "Vehicle Maintenance",
  "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT": "Credit Card Fees",
  "LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT": "Interest Expense",
  "LOAN_PAYMENTS_MORTGAGE_PAYMENT": "Rent", // For business premises
  "LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT": "Miscellaneous",
  
  // MEDICAL mappings
  "MEDICAL_DENTAL_CARE": "Insurance",
  "MEDICAL_EYE_CARE": "Insurance",
  "MEDICAL_NURSING_CARE": "Insurance",
  "MEDICAL_PHARMACIES_AND_SUPPLEMENTS": "Insurance",
  "MEDICAL_PRIMARY_CARE": "Insurance",
  "MEDICAL_VETERINARY_SERVICES": "Miscellaneous",
  
  // PERSONAL_CARE mappings
  "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS": "Miscellaneous",
  "PERSONAL_CARE_HAIR_AND_BEAUTY": "Miscellaneous",
  "PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING": "Miscellaneous",
  
  // GENERAL_SERVICES mappings
  "GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING": "Professional Fees",
  "GENERAL_SERVICES_AUTOMOTIVE": "Vehicle Maintenance",
  "GENERAL_SERVICES_CONSULTING_AND_LEGAL": "Professional Fees",
  "GENERAL_SERVICES_EDUCATION": "Professional Fees",
  "GENERAL_SERVICES_INSURANCE": "Insurance",
  "GENERAL_SERVICES_POSTAGE_AND_SHIPPING": "Office Supplies",
  "GENERAL_SERVICES_STORAGE": "Rent",
  
  // RENT_AND_UTILITIES mappings
  "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY": "Utilities",
  "RENT_AND_UTILITIES_INTERNET_AND_CABLE": "Internet",
  "RENT_AND_UTILITIES_RENT": "Rent",
  "RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT": "Utilities",
  "RENT_AND_UTILITIES_TELEPHONE": "Telephone",
  "RENT_AND_UTILITIES_WATER": "Utilities",
  
  // TRAVEL mappings
  "TRAVEL_FLIGHTS": "Travel",
  "TRAVEL_GAS_STATIONS": "Fuel",
  "TRAVEL_HOTELS": "Travel",
  "TRAVEL_PARKING": "Travel",
  "TRAVEL_PUBLIC_TRANSIT": "Travel",
  "TRAVEL_RENTAL_CARS": "Travel",
  "TRAVEL_TAXIS_AND_RIDE_SHARES": "Travel",
  
  // TRANSPORTATION mappings
  "TRANSPORTATION_BIKES_AND_SCOOTERS": "Vehicle Maintenance",
  "TRANSPORTATION_GAS_STATIONS": "Fuel",
  "TRANSPORTATION_PARKING": "Vehicle Maintenance",
  "TRANSPORTATION_PUBLIC_TRANSIT": "Travel",
  "TRANSPORTATION_TAXIS_AND_RIDE_SHARES": "Travel",
  "TRANSPORTATION_TOLLS": "Vehicle Maintenance",
};

/**
 * Primary category fallback mappings for when detailed category doesn't match
 */
const PRIMARY_CATEGORY_FALLBACK_MAP: Record<string, ChartOfAccountCategory> = {
  "INCOME": "Other Income",
  "BANK_FEES": "Bank Charges",
  "ENTERTAINMENT": "Meals & Entertainment",
  "FOOD_AND_DRINK": "Meals & Entertainment",
  "GENERAL_MERCHANDISE": "Office Supplies",
  "HOME_IMPROVEMENT": "Miscellaneous",
  "LOAN_PAYMENTS": "Interest Expense",
  "MEDICAL": "Insurance",
  "PERSONAL_CARE": "Miscellaneous",
  "GENERAL_SERVICES": "Professional Fees",
  "RENT_AND_UTILITIES": "Utilities",
  "TRAVEL": "Travel",
  "TRANSPORTATION": "Vehicle Maintenance",
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
  
  // Default to Miscellaneous if no mapping found
  return "Miscellaneous";
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
 */
export const MERCHANT_OVERRIDES: Record<string, ChartOfAccountCategory> = {
  // Software and SaaS
  "GOOGLE": "Software Subscriptions",
  "AMAZON WEB SERVICES": "Software Subscriptions",
  "MICROSOFT": "Software Subscriptions",
  "ADOBE": "Software Subscriptions",
  "SLACK": "Software Subscriptions",
  "ZOOM": "Software Subscriptions",
  "DROPBOX": "Software Subscriptions",
  "GITHUB": "Software Subscriptions",
  
  // Marketing
  "FACEBOOK": "Advertising & Marketing",
  "GOOGLE ADS": "Advertising & Marketing",
  "LINKEDIN": "Advertising & Marketing",
  "TWITTER": "Advertising & Marketing",
  
  // Professional Services
  "QUICKBOOKS": "Professional Fees",
  "H&R BLOCK": "Professional Fees",
  "LEGALZOOM": "Professional Fees",
  
  // Utilities and Communication
  "BELL": "Telephone",
  "ROGERS": "Internet",
  "TELUS": "Telephone",
  "SHAW": "Internet",
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