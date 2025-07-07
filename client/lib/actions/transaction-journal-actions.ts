"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkTransactionLimit, incrementTransactionCount } from "@/lib/services/usage-tracking";
import {
  createTransactionWithJournalSchema,
  type CreateTransactionWithJournalData,
  type CreateTransactionResponse,
  type GetJournalEntriesResponse,
  type IncomeTransactionData,
  type ExpenseTransactionData,
  type TransferTransactionData,
} from "@/lib/types/journal-entries";

/**
 * Create a new transaction with journal entries (double-entry bookkeeping)
 */
export async function createTransactionWithJournal(data: CreateTransactionWithJournalData): Promise<CreateTransactionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate data
    const validatedData = createTransactionWithJournalSchema.parse(data);

    // Verify user has access to the business
    const hasAccess = await db.business.findFirst({
      where: {
        id: validatedData.businessId,
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } }
        ]
      }
    });

    if (!hasAccess) {
      return { success: false, error: "Access denied to this business" };
    }

    // Check usage limits
    const usageCheck = await checkTransactionLimit(session.user.id, validatedData.businessId);
    if (!usageCheck.allowed) {
      return { success: false, error: usageCheck.message || "Transaction limit exceeded" };
    }

    // Calculate total amount from journal entries
    const totalAmount = validatedData.journalEntries.reduce(
      (sum, entry) => sum + Math.max(entry.debitAmount, entry.creditAmount), 
      0
    ) / 2; // Divide by 2 since each amount appears twice (debit and credit)

    // Create transaction with journal entries in a transaction
    const result = await db.$transaction(async (prisma) => {
      // Create the transaction
      const transaction = await prisma.transaction.create({
        data: {
          businessId: validatedData.businessId,
          bankAccountId: validatedData.bankAccountId,
          type: validatedData.type,
          amount: totalAmount,
          date: validatedData.date,
          description: validatedData.description,
          reference: validatedData.reference,
          notes: validatedData.notes,
          createdById: session.user.id,
        }
      });

      // Create journal entries
      await prisma.journalEntry.createMany({
        data: validatedData.journalEntries.map(entry => ({
          transactionId: transaction.id,
          accountId: entry.accountId,
          debitAmount: entry.debitAmount,
          creditAmount: entry.creditAmount,
          description: entry.description
        }))
      });

      return transaction;
    });

    // Increment usage count
    await incrementTransactionCount(validatedData.businessId);

    return { success: true, transaction: result };
  } catch (error) {
    console.error("Error creating transaction with journal entries:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to create transaction" };
  }
}

/**
 * Create common transaction templates
 */
export async function createIncomeTransaction(data: IncomeTransactionData): Promise<CreateTransactionResponse> {
  return createTransactionWithJournal({
    businessId: data.businessId,
    date: data.date,
    description: data.description,
    type: "INCOME",
    bankAccountId: data.bankAccountId,
    reference: data.reference,
    notes: data.notes,
    journalEntries: [
      {
        accountId: data.cashAccountId,
        debitAmount: data.amount,
        creditAmount: 0,
        description: `Cash received: ${data.description}`
      },
      {
        accountId: data.incomeCategoryId,
        debitAmount: 0,
        creditAmount: data.amount,
        description: `Revenue: ${data.description}`
      }
    ]
  });
}

export async function createExpenseTransaction(data: ExpenseTransactionData): Promise<CreateTransactionResponse> {
  return createTransactionWithJournal({
    businessId: data.businessId,
    date: data.date,
    description: data.description,
    type: "EXPENSE",
    bankAccountId: data.bankAccountId,
    reference: data.reference,
    notes: data.notes,
    journalEntries: [
      {
        accountId: data.expenseCategoryId,
        debitAmount: data.amount,
        creditAmount: 0,
        description: `Expense: ${data.description}`
      },
      {
        accountId: data.cashAccountId,
        debitAmount: 0,
        creditAmount: data.amount,
        description: `Cash payment: ${data.description}`
      }
    ]
  });
}

export async function createTransferTransaction(data: TransferTransactionData): Promise<CreateTransactionResponse> {
  return createTransactionWithJournal({
    businessId: data.businessId,
    date: data.date,
    description: data.description,
    type: "TRANSFER",
    reference: data.reference,
    notes: data.notes,
    journalEntries: [
      {
        accountId: data.toAccountId,
        debitAmount: data.amount,
        creditAmount: 0,
        description: `Transfer in: ${data.description}`
      },
      {
        accountId: data.fromAccountId,
        debitAmount: 0,
        creditAmount: data.amount,
        description: `Transfer out: ${data.description}`
      }
    ]
  });
}

/**
 * Get journal entries for a transaction
 */
export async function getTransactionJournalEntries(transactionId: string): Promise<GetJournalEntriesResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const journalEntries = await db.journalEntry.findMany({
      where: { transactionId },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountCode: true,
            accountType: true
          }
        }
      },
      orderBy: [
        { debitAmount: 'desc' },
        { creditAmount: 'desc' }
      ]
    });

    return { success: true, journalEntries };
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    return { success: false, error: "Failed to fetch journal entries" };
  }
}