"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ChartAccount } from "@/lib/types";
import { getCurrentBusinessId } from "./business-context-actions";
import { CHART_OF_ACCOUNTS } from "@/lib/constants/chart-of-accounts";
import { 
  CreateBankAccountChartEntryParams,
  CreateBankAccountChartEntryResponse,
  CHART_OF_ACCOUNTS_ERROR_MESSAGES,
  BANK_ACCOUNT_CODE_RANGES,
  createBankAccountChartEntrySchema
} from "@/lib/types/chart-of-accounts";

/**
 * Create Chart of Accounts for a new business based on client requirements
 */
export async function createDefaultChartOfAccounts(
  businessId: string,
  userId: string
) {
  try {
    // Create accounts from the client's Chart of Accounts
    const accountsToCreate = CHART_OF_ACCOUNTS.map(account => ({
      businessId,
      accountCode: account.code,
      name: account.name,
      description: account.description,
      accountType: account.type as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
      isDefault: true,
      sortOrder: parseInt(account.code),
      creatorId: userId,
    }));

    await db.category.createMany({
      data: accountsToCreate,
    });

    return {
      success: true,
      message: "Chart of Accounts created successfully",
    };
  } catch (error) {
    console.error("Error creating chart of accounts:", error);
    return {
      success: false,
      error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.createFailed,
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
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.unauthorized };
    }

    // Get user's business if not provided
    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      // Use getCurrentBusinessId helper which handles multi-client system
      const currentBusinessId = await getCurrentBusinessId();
      if (!currentBusinessId) {
        return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.noBusinessFound };
      }
      targetBusinessId = currentBusinessId;
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
    return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.createFailed };
  }
}

/**
 * Create a new account in the Chart of Accounts
 * 
 * IMPORTANT: This is the ONLY function in the entire codebase that should
 * create new categories. All other parts of the system must use existing
 * categories from the Chart of Accounts.
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
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.unauthorized };
    }

    const validatedData = createAccountSchema.parse(data);

    // Get user's current business using multi-client aware helper
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.noBusinessFound };
    }

    // Check if account code already exists
    const existingAccount = await db.category.findFirst({
      where: {
        businessId,
        accountCode: validatedData.accountCode,
      },
    });

    if (existingAccount) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.accountCodeExists };
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
        businessId,
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
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.invalidAccountData };
    }
    return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.createFailed };
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
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.unauthorized };
    }

    // Get user's current business using multi-client aware helper
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.noBusinessFound };
    }

    // Verify account belongs to user's business
    const existingAccount = await db.category.findFirst({
      where: {
        id: accountId,
        businessId,
      },
    });

    if (!existingAccount) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.accountNotFound };
    }

    // Check if new account code conflicts (if being changed)
    if (data.accountCode && data.accountCode !== existingAccount.accountCode) {
      const conflictingAccount = await db.category.findFirst({
        where: {
          businessId,
          accountCode: data.accountCode,
          id: { not: accountId },
        },
      });

      if (conflictingAccount) {
        return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.accountCodeExists };
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
    return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.updateFailed };
  }
}

/**
 * Check if a business has Chart of Accounts set up.
 * Validates that the business has the minimum required account types and count.
 * 
 * @param {string} businessId - The ID of the business to check
 * @returns {Promise<boolean>} True if Chart of Accounts is properly set up, false otherwise
 */
export async function hasChartOfAccounts(businessId: string): Promise<boolean> {
  try {
    // Validate business ID
    if (!businessId || typeof businessId !== "string") {
      return false;
    }

    const accountCount = await db.category.count({
      where: {
        businessId,
        isActive: true,
      },
    });
    
    // Check if at least the minimum required accounts exist
    const requiredAccountTypes: ("ASSET" | "INCOME" | "EXPENSE")[] = ["ASSET", "INCOME", "EXPENSE"];
    const accountTypes = await db.category.findMany({
      where: {
        businessId,
        isActive: true,
        accountType: { in: requiredAccountTypes },
      },
      select: { accountType: true },
      distinct: ["accountType"],
    });
    
    // Require at least all required types and a minimum of 10 accounts total
    const hasRequiredTypes = accountTypes.length >= requiredAccountTypes.length;
    const hasMinimumAccounts = accountCount >= 10;
    
    return hasRequiredTypes && hasMinimumAccounts;
  } catch (error) {
    console.error("Error checking Chart of Accounts:", error);
    return false;
  }
}

/**
 * Deactivate an account (soft delete)
 */
export async function deactivateAccount(accountId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.unauthorized };
    }

    // Get user's current business using multi-client aware helper
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.noBusinessFound };
    }

    // Verify account belongs to user's business
    const account = await db.category.findFirst({
      where: {
        id: accountId,
        businessId,
      },
    });

    if (!account) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.accountNotFound };
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
    return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.deactivateFailed };
  }
}

/**
 * Update existing Chart of Accounts to match the current requirements.
 * This function updates or creates accounts to ensure they match the defined structure.
 * 
 * @param businessId - Optional business ID to update (uses current business if not provided)
 * @returns Success status and message
 */
export async function updateChartOfAccounts(businessId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.unauthorized };
    }

    // Get business ID
    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      const currentBusinessId = await getCurrentBusinessId();
      if (!currentBusinessId) {
        return { success: false, error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.noBusinessFound };
      }
      targetBusinessId = currentBusinessId;
    }

    // Use the Chart of Accounts from constants
    const clientAccounts = CHART_OF_ACCOUNTS;

    // Process each account
    for (const account of clientAccounts) {
      // Check if account exists
      const existingAccount = await db.category.findFirst({
        where: {
          businessId: targetBusinessId,
          accountCode: account.code,
        },
      });

      if (existingAccount) {
        // Update existing account
        await db.category.update({
          where: { id: existingAccount.id },
          data: {
            name: account.name,
            description: account.description,
            accountType: account.type as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
            isActive: true,
            sortOrder: parseInt(account.code),
          },
        });
      } else {
        // Create new account
        await db.category.create({
          data: {
            businessId: targetBusinessId,
            accountCode: account.code,
            name: account.name,
            description: account.description,
            accountType: account.type as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
            isActive: true,
            isDefault: false,
            sortOrder: parseInt(account.code),
            creatorId: session.user.id,
          },
        });
      }
    }

    return {
      success: true,
      message: "Chart of Accounts updated successfully",
    };
  } catch (error) {
    console.error("Error updating Chart of Accounts:", error);
    return {
      success: false,
      error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.importFailed,
    };
  }
}

/**
 * Get the next available account code for a bank account (1201-1299 range)
 * 
 * This function finds the next sequential account code in the bank account range,
 * ensuring no conflicts with existing accounts. It starts from 1201 and increments
 * until it finds an available code.
 * 
 * @param businessId - The business ID to check for existing accounts
 * @returns The next available account code as a string, or null if range is exhausted
 * 
 * @internal
 */
async function getNextBankAccountCode(businessId: string): Promise<string | null> {
  const range = BANK_ACCOUNT_CODE_RANGES.BANK_ACCOUNTS;
  const existingAccounts = await db.category.findMany({
    where: {
      businessId,
      accountCode: {
        gte: range.start,
        lte: range.end,
      },
    },
    select: { accountCode: true },
    orderBy: { accountCode: "asc" },
  });

  // Start from the beginning of the range
  let nextCode = parseInt(range.start);
  
  for (const account of existingAccounts) {
    const existingCode = parseInt(account.accountCode);
    if (existingCode === nextCode) {
      nextCode++;
    } else {
      break;
    }
  }

  // Check if we've exhausted the range
  if (nextCode > parseInt(range.end)) {
    return null;
  }

  return nextCode.toString();
}

/**
 * Get the next available account code for a credit card (2101-2199 range)
 * 
 * This function finds the next sequential account code in the credit card range,
 * ensuring no conflicts with existing accounts. It starts from 2101 and increments
 * until it finds an available code. Credit cards are liabilities in the Chart of Accounts.
 * 
 * @param businessId - The business ID to check for existing accounts
 * @returns The next available account code as a string, or null if range is exhausted
 * 
 * @internal
 */
async function getNextCreditCardAccountCode(businessId: string): Promise<string | null> {
  const range = BANK_ACCOUNT_CODE_RANGES.CREDIT_CARDS;
  const existingAccounts = await db.category.findMany({
    where: {
      businessId,
      accountCode: {
        gte: range.start,
        lte: range.end,
      },
    },
    select: { accountCode: true },
    orderBy: { accountCode: "asc" },
  });

  // Start from the beginning of the range
  let nextCode = parseInt(range.start);
  
  for (const account of existingAccounts) {
    const existingCode = parseInt(account.accountCode);
    if (existingCode === nextCode) {
      nextCode++;
    } else {
      break;
    }
  }

  // Check if we've exhausted the range
  if (nextCode > parseInt(range.end)) {
    return null;
  }

  return nextCode.toString();
}

/**
 * Create a Chart of Accounts entry for a bank account
 * 
 * This function creates a dedicated GL account for each bank account to enable
 * proper double-entry bookkeeping and individual account tracking. Bank accounts
 * are assigned codes in the 1201-1299 range, while credit cards use 2101-2199.
 * 
 * @param bankAccount - The bank account details including ID, name, type, and institution
 * @param userId - The ID of the user creating the account (for audit trail)
 * @returns Promise resolving to success status with chart account details or error
 * 
 * @example
 * const result = await createBankAccountChartEntry({
 *   id: "clxyz123",
 *   businessId: "clxyz456",
 *   name: "Business Checking",
 *   accountType: "CHECKING",
 *   institution: "TD Bank",
 *   accountNumber: "****1234"
 * }, userId);
 * 
 * if (result.success) {
 *   console.log(`Created GL account ${result.chartAccount.accountCode}`);
 * }
 */
export async function createBankAccountChartEntry(
  bankAccount: CreateBankAccountChartEntryParams,
  userId: string
): Promise<CreateBankAccountChartEntryResponse> {
  try {
    // Validate input
    const validatedData = createBankAccountChartEntrySchema.parse(bankAccount);
    
    // Determine if it's a credit card or regular bank account
    const isCreditCard = validatedData.accountType === "CREDIT_CARD";
    
    // Get the next available account code
    const accountCode = isCreditCard 
      ? await getNextCreditCardAccountCode(validatedData.businessId)
      : await getNextBankAccountCode(validatedData.businessId);

    if (!accountCode) {
      return { 
        success: false, 
        error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.noAvailableAccountCodes(
          isCreditCard ? 'credit card' : 'bank account'
        ) 
      };
    }

    // Create the account name with institution and last 4 digits
    let accountName = validatedData.name;
    if (validatedData.institution) {
      accountName = `${validatedData.institution} - ${validatedData.name}`;
    }
    if (validatedData.accountNumber) {
      accountName += ` (${validatedData.accountNumber})`;
    }

    // Create the Chart of Accounts entry
    const chartAccount = await db.category.create({
      data: {
        businessId: validatedData.businessId,
        accountCode,
        name: accountName,
        description: `Bank account: ${validatedData.name}`,
        accountType: isCreditCard ? "LIABILITY" : "ASSET",
        isDefault: false,
        isActive: true,
        sortOrder: parseInt(accountCode),
        creatorId: userId,
        // Set parent account if needed
        parentId: undefined, // Could link to parent Cash or Credit Cards account if hierarchical
      },
    });

    // Update the bank account with the Chart of Accounts ID
    await db.bankAccount.update({
      where: { id: validatedData.id },
      data: { chartOfAccountsId: chartAccount.id },
    });

    return { 
      success: true, 
      chartAccount: {
        id: chartAccount.id,
        accountCode: chartAccount.accountCode,
        name: chartAccount.name,
        accountType: chartAccount.accountType,
      },
      message: `Created Chart of Accounts entry: ${accountCode} - ${accountName}`
    };
  } catch (error) {
    console.error("Error creating bank account chart entry:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors[0]?.message || CHART_OF_ACCOUNTS_ERROR_MESSAGES.invalidAccountData
      };
    }
    
    return { 
      success: false, 
      error: CHART_OF_ACCOUNTS_ERROR_MESSAGES.bankAccountChartEntryFailed 
    };
  }
}
