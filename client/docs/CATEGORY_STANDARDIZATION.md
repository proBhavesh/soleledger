# Category Standardization Policy

## Overview
SoleLedger enforces strict category standardization using ONLY the Chart of Accounts categories. No new categories can be created outside of the Chart of Accounts management system.

## Principles

1. **Single Source of Truth**: The Chart of Accounts is the ONLY source for categories
2. **No Dynamic Creation**: Categories are NEVER created automatically during transaction imports
3. **Fallback to Defaults**: When a specific category isn't found, use default categories:
   - Income: "Other Income" (account code 4100)
   - Expense: "Miscellaneous" (account code 9030)

## Standard Categories

### Income Categories
- Sales Revenue
- Service Revenue
- Consulting Revenue  
- Interest Income
- Other Income

### Expense Categories
- Advertising & Marketing
- Office Supplies
- Professional Fees
- Insurance
- Rent
- Utilities
- Telephone
- Internet
- Software Subscriptions
- Travel
- Meals & Entertainment
- Fuel
- Vehicle Maintenance
- Salaries & Wages
- Interest Expense
- Bank Charges
- Credit Card Fees
- Miscellaneous

## Implementation Details

### Bank Statement Imports
- AI suggests only standard categories from the list above
- `getCategoriesFromChartOfAccounts()` only returns existing categories
- Falls back to "Other Income" or "Miscellaneous" if no match found

### Plaid Transaction Imports
- Uses `mapPlaidCategoryToChartOfAccounts()` to map Plaid categories
- Maps consumer categories to business categories
- Never creates new categories

### Receipt Processing
- Receipts are matched to existing transactions
- Categories come from the matched transaction
- No category suggestion in receipt processing

## Developer Guidelines

1. **Never use `db.category.create()`** outside of Chart of Accounts management
2. **Always validate** that a category exists before using it
3. **Use fallback categories** when specific categories aren't found
4. **Test imports** to ensure they use only existing categories

## Benefits

- **Consistency**: All transactions use the same standardized categories
- **Reporting**: Clean, consistent financial reports
- **Compliance**: Proper categorization for tax and accounting purposes
- **Simplicity**: Users don't have to manage duplicate or similar categories