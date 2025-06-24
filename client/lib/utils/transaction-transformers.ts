/**
 * Transform Prisma transaction to dashboard Transaction type
 */

import type { Transaction as PrismaTransaction, Category, BankAccount } from "@/generated/prisma";
import type { Transaction } from "@/lib/types/dashboard";

type TransactionWithRelations = PrismaTransaction & {
  category?: Category | null;
  bankAccount?: BankAccount | null;
};

export function transformPrismaTransaction(
  transaction: TransactionWithRelations
): Transaction {
  return {
    id: transaction.id,
    description: transaction.description || "",
    amount: transaction.amount,
    type: transaction.type,
    date: transaction.date,
    category: transaction.category?.name || "Uncategorized",
    categoryId: transaction.categoryId,
    merchantName: null,
    merchantLogo: null,
    originalDescription: transaction.description,
    locationCity: null,
    locationRegion: null,
    paymentChannel: null,
    pending: false,
    categoryIconName: null,
    categoryConfidence: transaction.confidence,
    subcategory: null,
    accountId: transaction.bankAccountId,
    accountName: transaction.bankAccount?.name || null,
    notes: transaction.notes,
    reconciled: transaction.isReconciled,
    reconciledAt: null,
  };
}