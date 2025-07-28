import type { AccountType, AccountCodeRange, AccountRangeKey } from "@/lib/types/chart-of-accounts";

/**
 * Chart of Accounts based on accountant's specifications.
 * Follows standard accounting hierarchy with proper financial statement groupings.
 * These accounts are created automatically when a new business is set up.
 */
export const CHART_OF_ACCOUNTS: readonly {
  code: string;
  name: string;
  type: AccountType;
  description: string;
}[] = [
  // Assets
  { code: "1000", name: "Cash", type: "ASSET", description: "Funds held in checking or savings accounts." },
  { code: "1010", name: "Petty Cash", type: "ASSET", description: "Small cash on hand for minor expenses." },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", description: "Amounts owed to the business by customers." },
  { code: "1200", name: "Inventory", type: "ASSET", description: "Value of goods held for sale." },
  { code: "1300", name: "Prepaid Expenses", type: "ASSET", description: "Payments made in advance for services (e.g., rent, insurance)." },
  { code: "1400", name: "Fixed Assets", type: "ASSET", description: "Long-term tangible assets like equipment, furniture, etc." },
  { code: "1410", name: "Accumulated Depreciation", type: "ASSET", description: "Contra-asset account to track depreciation of fixed assets." },
  { code: "1500", name: "Other Assets", type: "ASSET", description: "Any other long-term assets not otherwise classified." },
  
  // Liabilities
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", description: "Amounts owed by the business to suppliers/vendors." },
  { code: "2100", name: "Credit Cards Payable", type: "LIABILITY", description: "Balances owed on business credit cards." },
  { code: "2200", name: "Payroll Liabilities", type: "LIABILITY", description: "Taxes and other withholdings owed for employee compensation." },
  { code: "2300", name: "Sales Tax Payable", type: "LIABILITY", description: "Sales tax collected from customers and owed to the government." },
  { code: "2400", name: "Loans Payable", type: "LIABILITY", description: "Outstanding loan balances." },
  { code: "2500", name: "Other Current Liabilities", type: "LIABILITY", description: "Miscellaneous short-term liabilities." },
  { code: "2600", name: "Long-Term Liabilities", type: "LIABILITY", description: "Debts due beyond one year." },
  
  // Equity
  { code: "3000", name: "Owner's Equity", type: "EQUITY", description: "Owner's investment in the business." },
  { code: "3050", name: "Opening Balance Equity", type: "EQUITY", description: "Temporary account for bank opening balances to ensure accounting equation balances." },
  { code: "3100", name: "Retained Earnings", type: "EQUITY", description: "Accumulated profits or losses retained in the business." },
  { code: "3200", name: "Drawings/Distributions", type: "EQUITY", description: "Withdrawals made by the owner (sole proprietorship)." },
  { code: "3300", name: "Common Stock", type: "EQUITY", description: "Capital invested by shareholders (corporation)." },
  { code: "3400", name: "Additional Paid-in Capital", type: "EQUITY", description: "Funds received from shareholders above par value." },
  
  // Income
  { code: "4000", name: "Sales Revenue", type: "INCOME", description: "Income from sale of products or services." },
  { code: "4100", name: "Other Revenue", type: "INCOME", description: "Non-operating income (e.g., interest income)." },
  
  // Cost of Sales
  { code: "5000", name: "Cost of Goods Sold (COGS)", type: "EXPENSE", description: "Direct costs of producing goods or services sold." },
  
  // Operating Expenses
  { code: "6000", name: "Salaries and Wages", type: "EXPENSE", description: "Employee compensation expenses." },
  { code: "6100", name: "Rent Expense", type: "EXPENSE", description: "Cost of office/store/warehouse rental." },
  { code: "6200", name: "Utilities Expense", type: "EXPENSE", description: "Electricity, water, gas, internet, etc." },
  { code: "6300", name: "Office Supplies", type: "EXPENSE", description: "Consumables used in daily operations." },
  { code: "6400", name: "Advertising & Marketing", type: "EXPENSE", description: "Promotion and marketing expenses." },
  { code: "6500", name: "Travel & Meals", type: "EXPENSE", description: "Business travel, lodging, and meals." },
  { code: "6600", name: "Professional Fees", type: "EXPENSE", description: "Legal, consulting, and accounting services." },
  { code: "6700", name: "Insurance Expense", type: "EXPENSE", description: "Premiums for business insurance policies." },
  { code: "6800", name: "Depreciation Expense", type: "EXPENSE", description: "Depreciation of fixed assets over time." },
  { code: "6900", name: "Miscellaneous Expense", type: "EXPENSE", description: "Any other expenses not categorized above." },
  
  // Tax Expense
  { code: "7000", name: "Tax Expense", type: "EXPENSE", description: "Tax expense" },
] as const;

/**
 * Account code constants for use throughout the application
 * This ensures we have a single source of truth for account codes
 */
export const ACCOUNT_CODES = {
  // Asset accounts
  CASH: "1000",
  PETTY_CASH: "1010",
  ACCOUNTS_RECEIVABLE: "1100",
  INVENTORY: "1200",
  PREPAID_EXPENSES: "1300",
  FIXED_ASSETS: "1400",
  ACCUMULATED_DEPRECIATION: "1410",
  OTHER_ASSETS: "1500",
  
  // Liability accounts
  ACCOUNTS_PAYABLE: "2000",
  CREDIT_CARDS_PAYABLE: "2100",
  PAYROLL_LIABILITIES: "2200",
  SALES_TAX_PAYABLE: "2300",
  LOANS_PAYABLE: "2400",
  OTHER_CURRENT_LIABILITIES: "2500",
  LONG_TERM_LIABILITIES: "2600",
  
  // Equity accounts
  OWNERS_EQUITY: "3000",
  OPENING_BALANCE_EQUITY: "3050",
  RETAINED_EARNINGS: "3100",
  DRAWINGS_DISTRIBUTIONS: "3200",
  COMMON_STOCK: "3300",
  ADDITIONAL_PAID_IN_CAPITAL: "3400",
  
  // Income accounts
  SALES_REVENUE: "4000",
  OTHER_REVENUE: "4100",
  
  // Cost of Sales
  COST_OF_GOODS_SOLD: "5000",
  
  // Operating Expenses
  SALARIES_WAGES: "6000",
  RENT_EXPENSE: "6100",
  UTILITIES_EXPENSE: "6200",
  OFFICE_SUPPLIES: "6300",
  ADVERTISING_MARKETING: "6400",
  TRAVEL_MEALS: "6500",
  PROFESSIONAL_FEES: "6600",
  INSURANCE_EXPENSE: "6700",
  DEPRECIATION_EXPENSE: "6800",
  MISCELLANEOUS_EXPENSE: "6900",
  
  // Tax
  TAX_EXPENSE: "7000",
} as const;

/**
 * Account ranges for validation.
 * Used to determine which range an account code falls into.
 */
export const ACCOUNT_RANGES: Record<AccountRangeKey, AccountCodeRange> = {
  ASSETS: { min: 1000, max: 1999 },
  LIABILITIES: { min: 2000, max: 2999 },
  EQUITY: { min: 3000, max: 3999 },
  INCOME: { min: 4000, max: 4999 },
  COST_OF_SALES: { min: 5000, max: 5999 },
  OPERATING_EXPENSES: { min: 6000, max: 6999 },
  TAX_EXPENSES: { min: 7000, max: 7999 },
} as const;

/**
 * Helper to get account by code.
 * 
 * @param {string} code - The account code to search for
 * @returns {typeof CHART_OF_ACCOUNTS[number] | undefined} The account if found, undefined otherwise
 */
export function getAccountByCode(code: string): typeof CHART_OF_ACCOUNTS[number] | undefined {
  return CHART_OF_ACCOUNTS.find(account => account.code === code);
}

/**
 * Helper to check if account code is in a specific range.
 * 
 * @param {string} code - The account code to check
 * @param {AccountRangeKey} rangeKey - The range key to check against
 * @returns {boolean} True if the code is within the specified range
 */
export function isAccountInRange(code: string, rangeKey: AccountRangeKey): boolean {
  const numCode = parseInt(code, 10);
  
  // Return false if code is not a valid number
  if (isNaN(numCode)) {
    return false;
  }
  
  const range = ACCOUNT_RANGES[rangeKey];
  return numCode >= range.min && numCode <= range.max;
}