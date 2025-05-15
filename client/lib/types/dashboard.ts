// Dashboard-related types for the SoleLedger application

// Transaction type from API
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string | Date;
  category: string;
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
}

// Recurring expense type for dashboard
export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  category: string;
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
