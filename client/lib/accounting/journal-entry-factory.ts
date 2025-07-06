import type { 
  JournalEntryAccountIds, 
  JournalEntrySet, 
  JournalEntryTransaction,
  JournalEntryInput 
} from "@/lib/types/bank-imports";

/**
 * Factory for creating journal entries based on transaction type
 * Implements proper double-entry bookkeeping rules
 */
export class JournalEntryFactory {
  constructor(private accounts: JournalEntryAccountIds) {
    // Validate required accounts
    if (!accounts.cashAccountId) {
      throw new Error("Cash account ID is required for journal entry creation");
    }
    
    // Ensure at least one income account exists
    if (!accounts.salesRevenueId && !accounts.serviceRevenueId && !accounts.otherIncomeId) {
      throw new Error("At least one income account is required");
    }
    
    // Ensure at least miscellaneous expense account exists as fallback
    if (!accounts.miscExpenseId) {
      console.warn("No miscellaneous expense account provided - some expense entries may fail");
    }
  }

  /**
   * Create journal entries based on transaction type
   */
  createJournalEntries(
    transaction: JournalEntryTransaction
  ): JournalEntrySet {
    const transactionType = transaction.transactionType || this.inferTransactionType(transaction);
    
    switch (transactionType) {
      case "income":
        return this.createIncomeEntries(transaction);
      
      case "expense":
        return this.createExpenseEntries(transaction);
      
      case "asset_purchase":
        return this.createAssetPurchaseEntries(transaction);
      
      case "inventory_purchase":
        return this.createInventoryPurchaseEntries(transaction);
      
      case "loan_payment":
        return this.createLoanPaymentEntries(transaction);
      
      case "credit_card_payment":
        return this.createCreditCardPaymentEntries(transaction);
      
      case "tax_payment":
        return this.createTaxPaymentEntries(transaction);
      
      case "tax_collection":
        return this.createTaxCollectionEntries(transaction);
      
      case "customer_payment":
        return this.createCustomerPaymentEntries(transaction);
      
      case "vendor_payment":
        return this.createVendorPaymentEntries(transaction);
      
      case "payroll":
        return this.createPayrollEntries(transaction);
      
      case "transfer":
        return this.createTransferEntries(transaction);
      
      default:
        // Default to simple income or expense
        return transaction.type === "credit" 
          ? this.createIncomeEntries(transaction)
          : this.createExpenseEntries(transaction);
    }
  }

  /**
   * Infer transaction type from description if not provided
   */
  private inferTransactionType(transaction: JournalEntryTransaction): string {
    const desc = transaction.description.toLowerCase();
    
    // Asset purchases
    if (desc.includes("equipment") || desc.includes("computer") || desc.includes("furniture")) {
      return "asset_purchase";
    }
    
    // Inventory
    if (desc.includes("inventory") || desc.includes("merchandise") || desc.includes("products")) {
      return "inventory_purchase";
    }
    
    // Loan payments
    if (desc.includes("loan payment") || desc.includes("loan pmt")) {
      return "loan_payment";
    }
    
    // Credit card payments
    if (desc.includes("credit card payment") || desc.includes("cc payment")) {
      return "credit_card_payment";
    }
    
    // Tax payments
    if (desc.includes("tax payment") || desc.includes("sales tax") || desc.includes("payroll tax")) {
      return "tax_payment";
    }
    
    // Payroll
    if (desc.includes("payroll") || desc.includes("salary") || desc.includes("wages")) {
      return "payroll";
    }
    
    // Transfers
    if (desc.includes("transfer") || desc.includes("tfr")) {
      return "transfer";
    }
    
    // Default
    return transaction.type === "credit" ? "income" : "expense";
  }

  /**
   * Simple income transaction (cash sale)
   */
  private createIncomeEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Handle sales tax if present
    const netAmount = transaction.taxAmount 
      ? transaction.amount - transaction.taxAmount
      : transaction.amount;
    
    // Debit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Cash received: ${transaction.description}`,
    });
    
    // Credit: Revenue
    const revenueAccountId = transaction.categoryId || 
      this.accounts.salesRevenueId || 
      this.accounts.serviceRevenueId ||
      this.accounts.otherIncomeId!;
      
    entries.push({
      accountId: revenueAccountId,
      debitAmount: 0,
      creditAmount: netAmount,
      description: `Revenue: ${transaction.description}`,
    });
    
    // Credit: Sales Tax Payable (if applicable)
    if (transaction.taxAmount && this.accounts.salesTaxPayableId) {
      entries.push({
        accountId: this.accounts.salesTaxPayableId,
        debitAmount: 0,
        creditAmount: transaction.taxAmount,
        description: `Sales tax collected`,
      });
    }
    
    return { entries };
  }

  /**
   * Simple expense transaction (cash payment)
   */
  private createExpenseEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Debit: Expense
    const expenseAccountId = transaction.categoryId || this.accounts.miscExpenseId!;
    entries.push({
      accountId: expenseAccountId,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Expense: ${transaction.description}`,
    });
    
    // Credit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Cash payment: ${transaction.description}`,
    });
    
    return { entries };
  }

  /**
   * Asset purchase (equipment, furniture, etc.)
   */
  private createAssetPurchaseEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Debit: Fixed Assets
    const assetAccountId = transaction.categoryId || this.accounts.fixedAssetsId!;
    entries.push({
      accountId: assetAccountId,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Asset purchase: ${transaction.description}`,
    });
    
    // Credit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Payment for asset: ${transaction.description}`,
    });
    
    return { entries };
  }

  /**
   * Inventory purchase
   */
  private createInventoryPurchaseEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Debit: Inventory
    entries.push({
      accountId: this.accounts.inventoryId!,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Inventory purchase: ${transaction.description}`,
    });
    
    // Credit: Cash (or AP if on credit)
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Payment for inventory: ${transaction.description}`,
    });
    
    return { entries };
  }

  /**
   * Loan payment (split between principal and interest)
   */
  private createLoanPaymentEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // If principal and interest are specified
    if (transaction.principalAmount && transaction.interestAmount) {
      // Debit: Loans Payable (principal)
      entries.push({
        accountId: this.accounts.loansPayableId!,
        debitAmount: transaction.principalAmount,
        creditAmount: 0,
        description: `Loan principal payment`,
      });
      
      // Debit: Interest Expense
      entries.push({
        accountId: this.accounts.interestExpenseId!,
        debitAmount: transaction.interestAmount,
        creditAmount: 0,
        description: `Loan interest`,
      });
    } else {
      // Estimate split (assume 20% interest, 80% principal)
      const interestAmount = transaction.amount * 0.2;
      const principalAmount = transaction.amount * 0.8;
      
      entries.push({
        accountId: this.accounts.loansPayableId!,
        debitAmount: principalAmount,
        creditAmount: 0,
        description: `Loan principal payment (estimated)`,
      });
      
      entries.push({
        accountId: this.accounts.interestExpenseId!,
        debitAmount: interestAmount,
        creditAmount: 0,
        description: `Loan interest (estimated)`,
      });
    }
    
    // Credit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Loan payment: ${transaction.description}`,
    });
    
    return { entries };
  }

  /**
   * Credit card payment
   */
  private createCreditCardPaymentEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Debit: Credit Cards Payable
    entries.push({
      accountId: this.accounts.creditCardsPayableId!,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Credit card payment: ${transaction.description}`,
    });
    
    // Credit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Payment to credit card`,
    });
    
    return { entries };
  }

  /**
   * Tax payment to government
   */
  private createTaxPaymentEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Determine which tax account based on description
    const taxAccountId = transaction.description.toLowerCase().includes("payroll")
      ? this.accounts.payrollTaxPayableId
      : this.accounts.salesTaxPayableId;
    
    // Debit: Tax Payable
    entries.push({
      accountId: taxAccountId!,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Tax payment: ${transaction.description}`,
    });
    
    // Credit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Payment to tax authority`,
    });
    
    return { entries };
  }

  /**
   * Sales with tax collected
   */
  private createTaxCollectionEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    // This is handled in createIncomeEntries when taxAmount is present
    return this.createIncomeEntries(transaction);
  }

  /**
   * Customer payment (reducing AR)
   */
  private createCustomerPaymentEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Debit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Payment received: ${transaction.description}`,
    });
    
    // Credit: Accounts Receivable
    entries.push({
      accountId: this.accounts.accountsReceivableId!,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Customer payment: ${transaction.description}`,
    });
    
    return { entries };
  }

  /**
   * Vendor payment (reducing AP)
   */
  private createVendorPaymentEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Debit: Accounts Payable
    entries.push({
      accountId: this.accounts.accountsPayableId!,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Vendor payment: ${transaction.description}`,
    });
    
    // Credit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Payment to vendor: ${transaction.description}`,
    });
    
    return { entries };
  }

  /**
   * Payroll entries
   */
  private createPayrollEntries(transaction: JournalEntryTransaction): JournalEntrySet {
    const entries: JournalEntryInput[] = [];
    
    // Simple version - just salary expense
    // In reality, would need to handle deductions, taxes, etc.
    
    // Debit: Salaries & Wages
    entries.push({
      accountId: this.accounts.salariesWagesId!,
      debitAmount: transaction.amount,
      creditAmount: 0,
      description: `Payroll: ${transaction.description}`,
    });
    
    // Credit: Cash
    entries.push({
      accountId: this.accounts.cashAccountId,
      debitAmount: 0,
      creditAmount: transaction.amount,
      description: `Payroll payment`,
    });
    
    return { entries };
  }

  /**
   * Transfer between accounts
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private createTransferEntries(_transaction: JournalEntryTransaction): JournalEntrySet {
    // Transfers should be ignored in bank imports as they'll appear in both accounts
    return { entries: [] };
  }
}