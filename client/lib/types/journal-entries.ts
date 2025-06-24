import { z } from "zod";
import type { Transaction, JournalEntry, Category } from "@/generated/prisma";

// Schema for journal entry input
export const journalEntrySchema = z.object({
  accountId: z.string(),
  debitAmount: z.number().min(0),
  creditAmount: z.number().min(0),
  description: z.string().optional()
});

// Schema for creating a transaction with journal entries
export const createTransactionWithJournalSchema = z.object({
  businessId: z.string(),
  date: z.date(),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  bankAccountId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  journalEntries: z.array(journalEntrySchema).min(2, "At least two journal entries are required")
}).refine((data) => {
  // Validate that debits equal credits
  const totalDebits = data.journalEntries.reduce((sum, entry) => sum + entry.debitAmount, 0);
  const totalCredits = data.journalEntries.reduce((sum, entry) => sum + entry.creditAmount, 0);
  return Math.abs(totalDebits - totalCredits) < 0.01;
}, {
  message: "Total debits must equal total credits"
});

// Type definitions
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type CreateTransactionWithJournalData = z.infer<typeof createTransactionWithJournalSchema>;

// Extended types for responses
export interface JournalEntryWithAccount extends JournalEntry {
  account: Pick<Category, "id" | "name" | "accountCode" | "accountType">;
}

export interface TransactionWithJournalEntries extends Transaction {
  journalEntries: JournalEntry[];
}

// Response types
export interface CreateTransactionResponse {
  success: boolean;
  transaction?: Transaction;
  error?: string;
}

export interface GetJournalEntriesResponse {
  success: boolean;
  journalEntries?: JournalEntryWithAccount[];
  error?: string;
}

// Common transaction template types
export interface IncomeTransactionData {
  businessId: string;
  amount: number;
  date: Date;
  description: string;
  bankAccountId?: string;
  incomeCategoryId: string;
  cashAccountId: string;
  reference?: string;
  notes?: string;
}

export interface ExpenseTransactionData {
  businessId: string;
  amount: number;
  date: Date;
  description: string;
  bankAccountId?: string;
  expenseCategoryId: string;
  cashAccountId: string;
  reference?: string;
  notes?: string;
}

export interface TransferTransactionData {
  businessId: string;
  amount: number;
  date: Date;
  description: string;
  fromAccountId: string;
  toAccountId: string;
  reference?: string;
  notes?: string;
}

// Account balance types
export interface AccountBalanceEntry {
  date: Date;
  description: string;
  debit: number;
  credit: number;
  change: number;
  balance: number;
}

export interface AccountBalanceDetails {
  success: boolean;
  account?: Pick<Category, "id" | "name" | "accountCode" | "accountType">;
  entries?: AccountBalanceEntry[];
  finalBalance?: number;
  error?: string;
}

// UI Component types
export interface JournalEntryLine {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  accountCode: string;
  accountType: string;
}