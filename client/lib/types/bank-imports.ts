import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

/**
 * Processing status for bank statement imports
 */
export const ProcessingStatusEnum = z.enum([
  "PENDING",
  "PROCESSING", 
  "COMPLETED",
  "FAILED"
]);

export type ProcessingStatus = z.infer<typeof ProcessingStatusEnum>;

/**
 * Bank statement import history item
 */
export interface ImportHistory {
  id: string;
  name: string;
  uploadedAt: string;
  status: ProcessingStatus;
  transactionCount: number;
}

/**
 * Bank statement import response
 */
export interface ImportBankStatementResponse {
  success: boolean;
  data?: {
    imported: number;
    failed: number;
    skipped: number;
    total: number;
  };
  error?: string;
}

/**
 * Duplicate check result for transactions
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  matchedTransaction?: {
    id: string;
    date: Date;
    amount: number;
    description: string;
  };
}

/**
 * Batch import transaction with optional selection
 */
export interface BatchImportTransaction {
  date: Date;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  balance?: number;
  reference?: string;
  suggestedCategory?: string;
  transactionType?: string;
  taxAmount?: number;
  principalAmount?: number;
  interestAmount?: number;
  selected?: boolean;
  bankAccountId: string;
  categoryId?: string;
  vendor?: string | null;
  externalId?: string | null;
  pending?: boolean;
}

/**
 * Journal entry without transactionId for batch creation
 */
export type JournalEntryInput = Omit<Prisma.JournalEntryCreateManyInput, "transactionId">;

/**
 * Journal entry set returned by factory
 */
export interface JournalEntrySet {
  entries: JournalEntryInput[];
  requiresSplitTransaction?: boolean;
  splitTransactions?: Array<{
    amount: number;
    type: "INCOME" | "EXPENSE";
    categoryId: string;
    description: string;
  }>;
}

/**
 * Account IDs for journal entry creation
 * Maps to Chart of Accounts structure
 */
export interface JournalEntryAccountIds {
  // Asset accounts (required: cash is always needed)
  cashAccountId: string;
  accountsReceivableId?: string;
  inventoryId?: string;
  prepaidExpensesId?: string;
  fixedAssetsId?: string;
  
  // Liability accounts
  accountsPayableId?: string;
  creditCardsPayableId?: string;
  salesTaxPayableId?: string;
  payrollTaxPayableId?: string;
  loansPayableId?: string;
  
  // Income accounts (at least one income account should be provided)
  salesRevenueId?: string;
  serviceRevenueId?: string;
  otherIncomeId?: string;
  
  // Expense accounts (at least miscExpenseId should be provided as fallback)
  costOfGoodsSoldId?: string;
  salariesWagesId?: string;
  rentExpenseId?: string;
  utilitiesExpenseId?: string;
  interestExpenseId?: string;
  miscExpenseId?: string;
}

/**
 * Extended transaction type for journal entry creation
 */
export interface JournalEntryTransaction {
  // From BankStatementTransaction
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance?: number;
  reference?: string;
  suggestedCategory?: string;
  transactionType?: string;
  taxAmount?: number;
  principalAmount?: number;
  interestAmount?: number;
  
  // Additional fields for journal entry creation
  transactionId?: string;
  businessId: string;
  bankAccountId: string;
  categoryId?: string;
}

/**
 * Chart of Accounts category mapping
 */
export interface ChartOfAccountsMap {
  // Asset accounts
  cash?: string;
  accountsReceivable?: string;
  inventory?: string;
  prepaidExpenses?: string;
  officeEquipment?: string;
  furniture?: string;
  vehicles?: string;
  
  // Liability accounts
  accountsPayable?: string;
  creditCards?: string;
  salesTaxPayable?: string;
  payrollTaxPayable?: string;
  loans?: string;
  
  // Income accounts
  salesRevenue?: string;
  serviceRevenue?: string;
  interestIncome?: string;
  otherIncome?: string;
  
  // Expense accounts
  costOfGoodsSold?: string;
  salariesWages?: string;
  rent?: string;
  utilities?: string;
  officeSupplies?: string;
  advertising?: string;
  travel?: string;
  meals?: string;
  professionalFees?: string;
  insurance?: string;
  telephone?: string;
  internet?: string;
  software?: string;
  fuel?: string;
  vehicleMaintenance?: string;
  interestExpense?: string;
  bankCharges?: string;
  creditCardFees?: string;
  depreciation?: string;
  miscellaneous?: string;
  otherExpense?: string;
}

/**
 * Processing result for batch operations
 */
export interface ProcessingResult {
  imported: number;
  failed: number;
  skipped: number;
  errors: Array<{
    batch?: number;
    count?: number;
    message?: string;
    error?: string;
  }>;
  transactionIds: string[];
}

/**
 * Progress tracking for batch processing
 */
export interface ProcessingProgress {
  total: number;
  processed: number;
  currentBatch: number;
  totalBatches: number;
  status: 'processing' | 'completed' | 'failed';
}