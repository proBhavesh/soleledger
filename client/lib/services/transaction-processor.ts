/**
 * Robust Transaction Processor for handling large batch imports
 * with proper error handling, progress tracking, and performance optimization
 */

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { JournalEntryFactory } from "@/lib/accounting/journal-entry-factory";
import { incrementTransactionCount } from "@/lib/services/usage-tracking";
import type { 
  BatchImportTransaction,
  ChartOfAccountsMap,
  JournalEntryInput,
  ProcessingResult,
  ProcessingProgress
} from "@/lib/types/bank-imports";

export interface TransactionProcessorConfig {
  batchSize: number;
  transactionTimeout: number;
  maxRetries: number;
  progressCallback?: (progress: ProcessingProgress) => void;
}

export interface ProcessingContext {
  businessId: string;
  userId: string;
  documentId: string;
  accountMap: ChartOfAccountsMap;
  journalFactory: JournalEntryFactory;
}

export class TransactionProcessor {
  private config: TransactionProcessorConfig;
  
  constructor(config?: Partial<TransactionProcessorConfig>) {
    this.config = {
      batchSize: config?.batchSize || 10,
      transactionTimeout: config?.transactionTimeout || 30000, // 30 seconds
      maxRetries: config?.maxRetries || 3,
      progressCallback: config?.progressCallback,
    };
  }

  /**
   * Process transactions in optimized batches with progress tracking
   */
  async processTransactions(
    transactions: BatchImportTransaction[],
    context: ProcessingContext
  ): Promise<ProcessingResult> {
    const results: ProcessingResult = {
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      transactionIds: [],
    };

    // Split transactions into manageable batches
    const batches = this.createBatches(transactions, this.config.batchSize);
    let processedCount = 0;

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        // Report progress
        this.reportProgress({
          total: transactions.length,
          processed: processedCount,
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          status: 'processing',
        });

        // Process batch with retry logic
        const batchResult = await this.processBatchWithRetry(batch, context);
        
        // Aggregate results
        results.imported += batchResult.imported;
        results.failed += batchResult.failed;
        results.skipped += batchResult.skipped;
        results.transactionIds.push(...batchResult.transactionIds);
        if (batchResult.errors) {
          results.errors.push(...batchResult.errors);
        }

        processedCount += batch.length;

      } catch (error) {
        // Log batch-level errors
        console.error(`Failed to process batch ${batchIndex + 1}:`, error);
        results.failed += batch.length;
        results.errors.push({
          batch: batchIndex + 1,
          count: batch.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update document status outside of transaction for better performance
    await this.updateDocumentStatus(context.documentId, results);

    // Report completion
    this.reportProgress({
      total: transactions.length,
      processed: transactions.length,
      currentBatch: batches.length,
      totalBatches: batches.length,
      status: 'completed',
    });

    return results;
  }

  /**
   * Process a single batch with retry logic
   */
  private async processBatchWithRetry(
    batch: BatchImportTransaction[],
    context: ProcessingContext,
    attempt: number = 1
  ): Promise<ProcessingResult> {
    try {
      return await this.processBatch(batch, context);
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        console.warn(`Retrying batch (attempt ${attempt + 1}/${this.config.maxRetries})`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return this.processBatchWithRetry(batch, context, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Process a single batch of transactions
   */
  private async processBatch(
    batch: BatchImportTransaction[],
    context: ProcessingContext
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      transactionIds: [],
    };

    // Prepare transaction data
    const transactionData: Prisma.TransactionCreateManyInput[] = [];
    const journalEntryBatches: Array<{
      transactionIndex: number;
      entries: JournalEntryInput[];
    }> = [];

    // Process each transaction in the batch
    for (const [index, transaction] of batch.entries()) {
      // Skip internal transfers
      if (transaction.type === "TRANSFER" && transaction.externalId) {
        const existingTransfer = await db.transaction.findFirst({
          where: {
            businessId: context.businessId,
            externalId: transaction.externalId,
          },
          select: { id: true },
        });

        if (existingTransfer) {
          result.skipped++;
          continue;
        }
      }

      // Create transaction data
      transactionData.push({
        businessId: context.businessId,
        bankAccountId: transaction.bankAccountId,
        categoryId: transaction.categoryId || this.getDefaultCategoryId(transaction, context.accountMap),
        amount: Math.abs(transaction.amount),
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        reference: transaction.reference,
        externalId: transaction.externalId,
        createdById: context.userId,
        // Store vendor in notes if available
        notes: transaction.vendor ? `Vendor: ${transaction.vendor}` : undefined,
      });

      // Generate journal entries
      const journalEntrySet = this.generateJournalEntries(transaction, context);
      if (journalEntrySet) {
        journalEntryBatches.push({
          transactionIndex: index,
          entries: journalEntrySet.entries,
        });
      }
    }

    // Execute database operations with optimized transaction scope
    try {
      const createdIds = await db.$transaction(
        async (prisma) => {
          // Create transactions
          const createdTransactions = await prisma.transaction.createManyAndReturn({
            data: transactionData,
            select: { id: true },
          });

          // Create journal entries
          const allJournalEntries: Prisma.JournalEntryCreateManyInput[] = [];
          createdTransactions.forEach((tx, idx) => {
            const journalBatch = journalEntryBatches.find(b => b.transactionIndex === idx);
            if (journalBatch) {
              journalBatch.entries.forEach(entry => {
                allJournalEntries.push({
                  ...entry,
                  transactionId: tx.id,
                });
              });
            }
          });

          if (allJournalEntries.length > 0) {
            await prisma.journalEntry.createMany({
              data: allJournalEntries,
            });
          }

          return createdTransactions.map(tx => tx.id);
        },
        {
          timeout: this.config.transactionTimeout,
        }
      );

      result.imported = createdIds.length;
      result.transactionIds = createdIds;

      // Increment usage count outside transaction for better performance
      if (result.imported > 0) {
        await incrementTransactionCount(context.businessId, result.imported)
          .catch(error => console.error('Failed to update usage count:', error));
      }

    } catch (error) {
      console.error('Transaction failed:', error);
      result.failed = transactionData.length;
      result.errors.push({
        message: error instanceof Error ? error.message : 'Database transaction failed',
        count: transactionData.length,
      });
    }

    return result;
  }

  /**
   * Generate journal entries for a transaction
   */
  private generateJournalEntries(
    transaction: BatchImportTransaction,
    context: ProcessingContext
  ): { entries: JournalEntryInput[] } | null {
    try {
      // Map category to appropriate account
      const categoryId = transaction.categoryId || this.getDefaultCategoryId(transaction, context.accountMap);
      
      // Create journal entries using factory
      const journalEntrySet = context.journalFactory.createJournalEntries({
        date: transaction.date.toISOString(),
        description: transaction.description,
        amount: Math.abs(transaction.amount),
        type: transaction.type === "INCOME" ? "credit" : "debit",
        businessId: context.businessId,
        bankAccountId: transaction.bankAccountId,
        categoryId,
        transactionType: transaction.type.toLowerCase(),
        taxAmount: transaction.taxAmount,
        principalAmount: transaction.principalAmount,
        interestAmount: transaction.interestAmount,
      });

      return journalEntrySet;
    } catch (error) {
      console.error('Failed to generate journal entries:', error);
      return null;
    }
  }

  /**
   * Get default category ID based on transaction type
   */
  private getDefaultCategoryId(
    transaction: BatchImportTransaction,
    accountMap: ChartOfAccountsMap
  ): string | undefined {
    // Ensure we have a miscellaneous expense account as fallback
    if (transaction.type === 'EXPENSE' && !transaction.categoryId) {
      return accountMap.miscellaneous || accountMap.otherExpense;
    }
    
    if (transaction.type === 'INCOME' && !transaction.categoryId) {
      return accountMap.otherIncome || accountMap.salesRevenue;
    }

    return transaction.categoryId;
  }

  /**
   * Update document status after processing
   */
  private async updateDocumentStatus(
    documentId: string,
    results: ProcessingResult
  ): Promise<void> {
    try {
      await db.document.update({
        where: { id: documentId },
        data: {
          processingStatus: results.failed > 0 ? "FAILED" : "COMPLETED",
          extractedData: {
            importedAt: new Date().toISOString(),
            importedTransactions: results.imported,
            failedTransactions: results.failed,
            skippedTransactions: results.skipped,
            errors: results.errors,
          },
        },
      });
    } catch (error) {
      console.error('Failed to update document status:', error);
    }
  }

  /**
   * Split transactions into batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Report progress to callback if provided
   */
  private reportProgress(progress: ProcessingProgress): void {
    if (this.config.progressCallback) {
      this.config.progressCallback(progress);
    }
  }
}