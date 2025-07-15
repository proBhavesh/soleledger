"use server";

import { auth } from "@/lib/auth";
import { createDefaultChartOfAccounts } from "./chart-of-accounts-actions";
import type { ChartOfAccountsResult } from "@/lib/types/chart-of-accounts";

/**
 * Server action to create default Chart of Accounts with proper authentication.
 * Validates the user session and creates standard accounts for the specified business.
 * 
 * @param {string} businessId - The ID of the business to create accounts for
 * @returns {Promise<ChartOfAccountsResult>} Result object with success status and optional error
 */
export async function createChartOfAccountsForBusiness(
  businessId: string
): Promise<ChartOfAccountsResult> {
  try {
    // Validate business ID
    if (!businessId || typeof businessId !== "string") {
      return { 
        success: false, 
        error: "Invalid business ID provided" 
      };
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return { 
        success: false, 
        error: "You must be logged in to create Chart of Accounts" 
      };
    }

    // Create Chart of Accounts
    const result = await createDefaultChartOfAccounts(businessId, session.user.id);
    
    return result;
  } catch (error) {
    console.error("Error creating Chart of Accounts:", error);
    
    return { 
      success: false, 
      error: error instanceof Error 
        ? error.message 
        : "An unexpected error occurred while creating Chart of Accounts" 
    };
  }
}