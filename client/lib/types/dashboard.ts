// Dashboard-related types for the SoleLedger application

// Transaction type from API
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string | Date;
  category: string;
  categoryId?: string | null;
  // Enhanced fields from Plaid
  merchantName?: string | null;
  merchantLogo?: string | null;
  originalDescription?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  paymentChannel?: string | null;
  pending?: boolean;
  categoryIconName?: string | null;
  categoryConfidence?: number | null;
  subcategory?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  notes?: string | null;
  reconciled?: boolean;
  reconciledAt?: string | Date | null;
}

// Transaction filter values for filtering transactions
export interface TransactionFilterValues {
  search?: string;
  category?: string;
  accountId?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  type?: "INCOME" | "EXPENSE";
  minAmount?: number;
  maxAmount?: number;
}

// Balance history point for account balance charts
export interface BalanceHistoryPoint {
  date: Date;
  balance: number;
}

// Category type for transaction categorization
export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  description?: string;
}

// BankAccount type
export interface BankAccount {
  id: string;
  name: string;
  balance: number | null;
  institution: string | null;
  lastSync?: Date | null;
  currency: string;
  businessId: string;
  accountNumber?: string | null;
  routingNumber?: string | null;
  plaidItemId?: string | null;
  plaidAccessToken?: string | null;
  accountType?: string | null;
  availableBalance?: number | null;
}

// Recurring expense type for dashboard
export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  category: string;
  flow: "INFLOW" | "OUTFLOW";
  lastDate?: string;
  nextDate?: string;
  merchantName?: string | null;
  merchantLogo?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  accountNumber?: string | null;
  routingNumber?: string | null;
  plaidItemId?: string | null;
  plaidAccessToken?: string | null;
  accountType?: string | null;
  availableBalance?: number | null;
}

// Financial summary data
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  pendingReceipts: number;
  totalBalance: number;
  recentTransactions: Transaction[];
  hasConnectedAccounts: boolean;
  recurringExpenses: RecurringExpense[];
  bankAccounts: BankAccount[]; // For refresh functionality
}

// Client type for accountant dashboard
export interface Client {
  id?: string;
  name: string;
  status: "Complete" | "Needs Review" | "Attention Needed";
  lastUpdated: string;
  pendingTransactions: number;
}
