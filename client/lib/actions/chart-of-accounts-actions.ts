"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ChartAccount } from "@/lib/types";
import { getCurrentBusinessId } from "./business-context-actions";
import { CHART_OF_ACCOUNTS } from "@/lib/constants/chart-of-accounts";

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
      error: "Failed to create chart of accounts",
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
      // Use getCurrentBusinessId helper which handles multi-client system
      const currentBusinessId = await getCurrentBusinessId();
      if (!currentBusinessId) {
        return { success: false, error: "No business found" };
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
    return { success: false, error: "Failed to fetch chart of accounts" };
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
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createAccountSchema.parse(data);

    // Get user's current business using multi-client aware helper
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    // Check if account code already exists
    const existingAccount = await db.category.findFirst({
      where: {
        businessId,
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

    // Get user's current business using multi-client aware helper
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    // Verify account belongs to user's business
    const existingAccount = await db.category.findFirst({
      where: {
        id: accountId,
        businessId,
      },
    });

    if (!existingAccount) {
      return { success: false, error: "Account not found" };
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
      return { success: false, error: "Unauthorized" };
    }

    // Get user's current business using multi-client aware helper
    const businessId = await getCurrentBusinessId();
    if (!businessId) {
      return { success: false, error: "No business found" };
    }

    // Verify account belongs to user's business
    const account = await db.category.findFirst({
      where: {
        id: accountId,
        businessId,
      },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
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
      return { success: false, error: "Unauthorized" };
    }

    // Get business ID
    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      const currentBusinessId = await getCurrentBusinessId();
      if (!currentBusinessId) {
        return { success: false, error: "No business found" };
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
      error: "Failed to import Chart of Accounts",
    };
  }
}
