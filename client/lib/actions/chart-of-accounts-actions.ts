"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ChartAccount, DefaultChartAccount } from "@/lib/types";

// Standard Chart of Accounts template for Canadian businesses
const DEFAULT_CHART_OF_ACCOUNTS: DefaultChartAccount[] = [
  // ASSETS (1000-1999)
  {
    code: "1000",
    name: "Cash and Cash Equivalents",
    type: "ASSET",
    sort: 1000,
  },
  {
    code: "1010",
    name: "Checking Account",
    type: "ASSET",
    sort: 1010,
    parent: "1000",
  },
  {
    code: "1020",
    name: "Savings Account",
    type: "ASSET",
    sort: 1020,
    parent: "1000",
  },
  {
    code: "1030",
    name: "Petty Cash",
    type: "ASSET",
    sort: 1030,
    parent: "1000",
  },

  { code: "1100", name: "Accounts Receivable", type: "ASSET", sort: 1100 },
  {
    code: "1110",
    name: "Trade Receivables",
    type: "ASSET",
    sort: 1110,
    parent: "1100",
  },
  {
    code: "1120",
    name: "Other Receivables",
    type: "ASSET",
    sort: 1120,
    parent: "1100",
  },

  { code: "1200", name: "Inventory", type: "ASSET", sort: 1200 },
  {
    code: "1210",
    name: "Raw Materials",
    type: "ASSET",
    sort: 1210,
    parent: "1200",
  },
  {
    code: "1220",
    name: "Finished Goods",
    type: "ASSET",
    sort: 1220,
    parent: "1200",
  },

  { code: "1300", name: "Prepaid Expenses", type: "ASSET", sort: 1300 },
  {
    code: "1310",
    name: "Prepaid Insurance",
    type: "ASSET",
    sort: 1310,
    parent: "1300",
  },
  {
    code: "1320",
    name: "Prepaid Rent",
    type: "ASSET",
    sort: 1320,
    parent: "1300",
  },

  {
    code: "1500",
    name: "Property, Plant & Equipment",
    type: "ASSET",
    sort: 1500,
  },
  {
    code: "1510",
    name: "Office Equipment",
    type: "ASSET",
    sort: 1510,
    parent: "1500",
  },
  {
    code: "1520",
    name: "Computer Equipment",
    type: "ASSET",
    sort: 1520,
    parent: "1500",
  },
  {
    code: "1530",
    name: "Furniture & Fixtures",
    type: "ASSET",
    sort: 1530,
    parent: "1500",
  },
  { code: "1540", name: "Vehicles", type: "ASSET", sort: 1540, parent: "1500" },

  // LIABILITIES (2000-2999)
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", sort: 2000 },
  {
    code: "2010",
    name: "Trade Payables",
    type: "LIABILITY",
    sort: 2010,
    parent: "2000",
  },
  {
    code: "2020",
    name: "Accrued Expenses",
    type: "LIABILITY",
    sort: 2020,
    parent: "2000",
  },

  { code: "2100", name: "Short-term Debt", type: "LIABILITY", sort: 2100 },
  {
    code: "2110",
    name: "Credit Cards",
    type: "LIABILITY",
    sort: 2110,
    parent: "2100",
  },
  {
    code: "2120",
    name: "Line of Credit",
    type: "LIABILITY",
    sort: 2120,
    parent: "2100",
  },

  { code: "2200", name: "Payroll Liabilities", type: "LIABILITY", sort: 2200 },
  {
    code: "2210",
    name: "CPP Payable",
    type: "LIABILITY",
    sort: 2210,
    parent: "2200",
  },
  {
    code: "2220",
    name: "EI Payable",
    type: "LIABILITY",
    sort: 2220,
    parent: "2200",
  },
  {
    code: "2230",
    name: "Income Tax Payable",
    type: "LIABILITY",
    sort: 2230,
    parent: "2200",
  },

  { code: "2300", name: "Sales Tax Payable", type: "LIABILITY", sort: 2300 },
  {
    code: "2310",
    name: "GST/HST Payable",
    type: "LIABILITY",
    sort: 2310,
    parent: "2300",
  },
  {
    code: "2320",
    name: "PST Payable",
    type: "LIABILITY",
    sort: 2320,
    parent: "2300",
  },

  { code: "2500", name: "Long-term Debt", type: "LIABILITY", sort: 2500 },
  {
    code: "2510",
    name: "Bank Loans",
    type: "LIABILITY",
    sort: 2510,
    parent: "2500",
  },
  {
    code: "2520",
    name: "Equipment Loans",
    type: "LIABILITY",
    sort: 2520,
    parent: "2500",
  },

  // EQUITY (3000-3999)
  { code: "3000", name: "Owner's Equity", type: "EQUITY", sort: 3000 },
  {
    code: "3010",
    name: "Owner's Capital",
    type: "EQUITY",
    sort: 3010,
    parent: "3000",
  },
  {
    code: "3020",
    name: "Owner's Drawings",
    type: "EQUITY",
    sort: 3020,
    parent: "3000",
  },
  { code: "3100", name: "Retained Earnings", type: "EQUITY", sort: 3100 },
  { code: "3200", name: "Current Year Earnings", type: "EQUITY", sort: 3200 },

  // INCOME (4000-4999)
  { code: "4000", name: "Revenue", type: "INCOME", sort: 4000 },
  {
    code: "4010",
    name: "Sales Revenue",
    type: "INCOME",
    sort: 4010,
    parent: "4000",
  },
  {
    code: "4020",
    name: "Service Revenue",
    type: "INCOME",
    sort: 4020,
    parent: "4000",
  },
  {
    code: "4030",
    name: "Consulting Revenue",
    type: "INCOME",
    sort: 4030,
    parent: "4000",
  },

  { code: "4100", name: "Other Income", type: "INCOME", sort: 4100 },
  {
    code: "4110",
    name: "Interest Income",
    type: "INCOME",
    sort: 4110,
    parent: "4100",
  },
  {
    code: "4120",
    name: "Dividend Income",
    type: "INCOME",
    sort: 4120,
    parent: "4100",
  },
  {
    code: "4130",
    name: "Gain on Sale of Assets",
    type: "INCOME",
    sort: 4130,
    parent: "4100",
  },

  // EXPENSES (5000-9999)
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", sort: 5000 },
  {
    code: "5010",
    name: "Materials",
    type: "EXPENSE",
    sort: 5010,
    parent: "5000",
  },
  {
    code: "5020",
    name: "Direct Labor",
    type: "EXPENSE",
    sort: 5020,
    parent: "5000",
  },
  {
    code: "5030",
    name: "Manufacturing Overhead",
    type: "EXPENSE",
    sort: 5030,
    parent: "5000",
  },

  { code: "6000", name: "Operating Expenses", type: "EXPENSE", sort: 6000 },
  {
    code: "6010",
    name: "Advertising & Marketing",
    type: "EXPENSE",
    sort: 6010,
    parent: "6000",
  },
  {
    code: "6020",
    name: "Office Supplies",
    type: "EXPENSE",
    sort: 6020,
    parent: "6000",
  },
  {
    code: "6030",
    name: "Professional Fees",
    type: "EXPENSE",
    sort: 6030,
    parent: "6000",
  },
  {
    code: "6040",
    name: "Insurance",
    type: "EXPENSE",
    sort: 6040,
    parent: "6000",
  },
  { code: "6050", name: "Rent", type: "EXPENSE", sort: 6050, parent: "6000" },
  {
    code: "6060",
    name: "Utilities",
    type: "EXPENSE",
    sort: 6060,
    parent: "6000",
  },
  {
    code: "6070",
    name: "Telephone",
    type: "EXPENSE",
    sort: 6070,
    parent: "6000",
  },
  {
    code: "6080",
    name: "Internet",
    type: "EXPENSE",
    sort: 6080,
    parent: "6000",
  },
  {
    code: "6090",
    name: "Software Subscriptions",
    type: "EXPENSE",
    sort: 6090,
    parent: "6000",
  },

  { code: "6100", name: "Travel & Entertainment", type: "EXPENSE", sort: 6100 },
  { code: "6110", name: "Travel", type: "EXPENSE", sort: 6110, parent: "6100" },
  {
    code: "6120",
    name: "Meals & Entertainment",
    type: "EXPENSE",
    sort: 6120,
    parent: "6100",
  },

  { code: "6200", name: "Vehicle Expenses", type: "EXPENSE", sort: 6200 },
  { code: "6210", name: "Fuel", type: "EXPENSE", sort: 6210, parent: "6200" },
  {
    code: "6220",
    name: "Vehicle Maintenance",
    type: "EXPENSE",
    sort: 6220,
    parent: "6200",
  },
  {
    code: "6230",
    name: "Vehicle Insurance",
    type: "EXPENSE",
    sort: 6230,
    parent: "6200",
  },

  { code: "7000", name: "Payroll Expenses", type: "EXPENSE", sort: 7000 },
  {
    code: "7010",
    name: "Salaries & Wages",
    type: "EXPENSE",
    sort: 7010,
    parent: "7000",
  },
  {
    code: "7020",
    name: "CPP Expense",
    type: "EXPENSE",
    sort: 7020,
    parent: "7000",
  },
  {
    code: "7030",
    name: "EI Expense",
    type: "EXPENSE",
    sort: 7030,
    parent: "7000",
  },
  {
    code: "7040",
    name: "Workers Compensation",
    type: "EXPENSE",
    sort: 7040,
    parent: "7000",
  },

  { code: "8000", name: "Financial Expenses", type: "EXPENSE", sort: 8000 },
  {
    code: "8010",
    name: "Interest Expense",
    type: "EXPENSE",
    sort: 8010,
    parent: "8000",
  },
  {
    code: "8020",
    name: "Bank Charges",
    type: "EXPENSE",
    sort: 8020,
    parent: "8000",
  },
  {
    code: "8030",
    name: "Credit Card Fees",
    type: "EXPENSE",
    sort: 8030,
    parent: "8000",
  },

  { code: "9000", name: "Other Expenses", type: "EXPENSE", sort: 9000 },
  {
    code: "9010",
    name: "Depreciation",
    type: "EXPENSE",
    sort: 9010,
    parent: "9000",
  },
  {
    code: "9020",
    name: "Bad Debt",
    type: "EXPENSE",
    sort: 9020,
    parent: "9000",
  },
  {
    code: "9030",
    name: "Miscellaneous",
    type: "EXPENSE",
    sort: 9030,
    parent: "9000",
  },
] as const;

/**
 * Create default Chart of Accounts for a new business
 */
export async function createDefaultChartOfAccounts(
  businessId: string,
  userId: string
) {
  try {
    // Create a map to store created accounts for parent-child relationships
    const createdAccounts = new Map<string, string>();

    // First pass: Create all parent accounts
    for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
      if (!account.parent) {
        const created = await db.category.create({
          data: {
            businessId,
            accountCode: account.code,
            name: account.name,
            accountType: account.type as
              | "ASSET"
              | "LIABILITY"
              | "EQUITY"
              | "INCOME"
              | "EXPENSE",
            isDefault: true,
            sortOrder: account.sort,
            creatorId: userId,
          },
        });
        createdAccounts.set(account.code, created.id);
      }
    }

    // Second pass: Create child accounts with parent references
    for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
      if (account.parent) {
        const parentId = createdAccounts.get(account.parent);
        if (parentId) {
          const created = await db.category.create({
            data: {
              businessId,
              accountCode: account.code,
              name: account.name,
              accountType: account.type as
                | "ASSET"
                | "LIABILITY"
                | "EQUITY"
                | "INCOME"
                | "EXPENSE",
              parentId,
              isDefault: true,
              sortOrder: account.sort,
              creatorId: userId,
            },
          });
          createdAccounts.set(account.code, created.id);
        }
      }
    }

    return {
      success: true,
      message: "Default Chart of Accounts created successfully",
    };
  } catch (error) {
    console.error("Error creating default chart of accounts:", error);
    return {
      success: false,
      error: "Failed to create default chart of accounts",
    };
  }
}

/**
 * Get the complete Chart of Accounts for a business
 */
export async function getChartOfAccounts(businessId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business if not provided
    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      const business = await db.business.findFirst({
        where: { ownerId: session.user.id },
      });
      if (!business) {
        return { success: false, error: "No business found" };
      }
      targetBusinessId = business.id;
    }

    // Get all accounts for the business
    const accounts = await db.category.findMany({
      where: {
        businessId: targetBusinessId,
        isActive: true,
      },
      include: {
        parent: true,
        subCategories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { accountCode: "asc" }],
    });

    // Build hierarchical structure
    const chartAccounts: ChartAccount[] = accounts
      .filter((account) => !account.parentId)
      .map((account) => ({
        id: account.id,
        accountCode: account.accountCode,
        name: account.name,
        accountType: account.accountType,
        description: account.description || undefined,
        parentId: account.parentId || undefined,
        isDefault: account.isDefault,
        isActive: account.isActive,
        sortOrder: account.sortOrder || undefined,
        subAccounts: account.subCategories.map((sub) => ({
          id: sub.id,
          accountCode: sub.accountCode,
          name: sub.name,
          accountType: sub.accountType,
          description: sub.description || undefined,
          parentId: sub.parentId || undefined,
          isDefault: sub.isDefault,
          isActive: sub.isActive,
          sortOrder: sub.sortOrder || undefined,
        })),
      }));

    return { success: true, accounts: chartAccounts };
  } catch (error) {
    console.error("Error fetching chart of accounts:", error);
    return { success: false, error: "Failed to fetch chart of accounts" };
  }
}

/**
 * Create a new account in the Chart of Accounts
 */
const createAccountSchema = z.object({
  accountCode: z.string().min(3, "Account code must be at least 3 characters"),
  name: z.string().min(1, "Account name is required"),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export async function createAccount(data: z.infer<typeof createAccountSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createAccountSchema.parse(data);

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Check if account code already exists
    const existingAccount = await db.category.findFirst({
      where: {
        businessId: business.id,
        accountCode: validatedData.accountCode,
      },
    });

    if (existingAccount) {
      return { success: false, error: "Account code already exists" };
    }

    // Determine sort order based on account type
    let sortOrder = 9999;
    const accountTypeRanges = {
      ASSET: 1000,
      LIABILITY: 2000,
      EQUITY: 3000,
      INCOME: 4000,
      EXPENSE: 5000,
    };

    if (validatedData.accountCode) {
      const codeNum = parseInt(validatedData.accountCode);
      if (!isNaN(codeNum)) {
        sortOrder = codeNum;
      } else {
        sortOrder = accountTypeRanges[validatedData.accountType];
      }
    }

    // Create the account
    const account = await db.category.create({
      data: {
        businessId: business.id,
        accountCode: validatedData.accountCode,
        name: validatedData.name,
        accountType: validatedData.accountType,
        description: validatedData.description,
        parentId: validatedData.parentId,
        sortOrder,
        creatorId: session.user.id,
      },
    });

    return { success: true, account };
  } catch (error) {
    console.error("Error creating account:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid account data" };
    }
    return { success: false, error: "Failed to create account" };
  }
}

/**
 * Update an existing account
 */
export async function updateAccount(
  accountId: string,
  data: Partial<z.infer<typeof createAccountSchema>>
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Verify account belongs to user's business
    const existingAccount = await db.category.findFirst({
      where: {
        id: accountId,
        businessId: business.id,
      },
    });

    if (!existingAccount) {
      return { success: false, error: "Account not found" };
    }

    // Check if new account code conflicts (if being changed)
    if (data.accountCode && data.accountCode !== existingAccount.accountCode) {
      const conflictingAccount = await db.category.findFirst({
        where: {
          businessId: business.id,
          accountCode: data.accountCode,
          id: { not: accountId },
        },
      });

      if (conflictingAccount) {
        return { success: false, error: "Account code already exists" };
      }
    }

    // Update the account
    const updatedAccount = await db.category.update({
      where: { id: accountId },
      data: {
        ...data,
        sortOrder: data.accountCode
          ? parseInt(data.accountCode) || undefined
          : undefined,
      },
    });

    return { success: true, account: updatedAccount };
  } catch (error) {
    console.error("Error updating account:", error);
    return { success: false, error: "Failed to update account" };
  }
}

/**
 * Deactivate an account (soft delete)
 */
export async function deactivateAccount(accountId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Check if account has transactions
    const transactionCount = await db.transaction.count({
      where: { categoryId: accountId },
    });

    if (transactionCount > 0) {
      // Deactivate instead of delete if has transactions
      await db.category.update({
        where: { id: accountId },
        data: { isActive: false },
      });

      return {
        success: true,
        message: "Account deactivated (has transactions)",
      };
    } else {
      // Can safely delete if no transactions
      await db.category.delete({
        where: { id: accountId },
      });

      return {
        success: true,
        message: "Account deleted successfully",
      };
    }
  } catch (error) {
    console.error("Error deactivating account:", error);
    return { success: false, error: "Failed to deactivate account" };
  }
}
