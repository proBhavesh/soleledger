/**
 * Chart of Accounts based on client requirements from CSV
 */
export const CHART_OF_ACCOUNTS = [
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
  { code: "3100", name: "Retained Earnings", type: "EQUITY", description: "Accumulated profits or losses retained in the business." },
  { code: "3200", name: "Drawings/Distributions", type: "EQUITY", description: "Withdrawals made by the owner (sole proprietorship)." },
  { code: "3300", name: "Common Stock", type: "EQUITY", description: "Capital invested by shareholders (corporation)." },
  { code: "3400", name: "Additional Paid-in Capital", type: "EQUITY", description: "Funds received from shareholders above par value." },
  
  // Income
  { code: "4000", name: "Sales Revenue", type: "INCOME", description: "Income from sale of products or services." },
  { code: "4100", name: "Other Revenue", type: "INCOME", description: "Non-operating income (e.g., interest income)." },
  
  // Expenses
  { code: "5000", name: "Cost of Goods Sold (COGS)", type: "EXPENSE", description: "Direct costs of producing goods or services sold." },
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
  { code: "7000", name: "Tax Expense", type: "EXPENSE", description: "Tax expense" },
] as const;