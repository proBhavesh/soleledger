import { z } from "zod";
import { CHART_OF_ACCOUNTS } from "@/lib/constants/chart-of-accounts";

// Schema for bank statement transaction
const BankStatementTransactionSchema = z.object({
  date: z.string(), // ISO date string
  description: z.string(),
  amount: z.number(),
  type: z.enum(["debit", "credit"]),
  balance: z.number().optional(),
  reference: z.string().optional(),
  suggestedCategory: z.string().optional(),
  transactionType: z.enum([
    "income",
    "expense", 
    "asset_purchase",
    "inventory_purchase",
    "loan_payment",
    "credit_card_payment",
    "tax_payment",
    "tax_collection",
    "customer_payment",
    "vendor_payment",
    "payroll",
    "transfer",
    "other"
  ]).optional(),
  taxAmount: z.number().optional(), // For transactions with sales tax
  principalAmount: z.number().optional(), // For loan payments
  interestAmount: z.number().optional(), // For loan payments
});

// Schema for bank statement data extraction
export const BankStatementDataSchema = z.object({
  type: z.literal("bank_statement"),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(), // Last 4 digits only
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  openingBalance: z.number().optional(),
  closingBalance: z.number().optional(),
  currency: z.string().default("CAD"),
  transactions: z.array(BankStatementTransactionSchema),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type BankStatementData = z.infer<typeof BankStatementDataSchema>;
export type BankStatementTransaction = z.infer<typeof BankStatementTransactionSchema>;

// Claude API response schema
const ClaudeResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal("text"),
      text: z.string(),
    })
  ),
});

/**
 * Preprocess Claude response to handle null values
 */
function preprocessClaudeResponse(data: unknown): unknown {
  if (data === null) return undefined;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map(preprocessClaudeResponse);
  }

  const processed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    processed[key] = value === null ? undefined : preprocessClaudeResponse(value);
  }
  return processed;
}

/**
 * Process a bank statement PDF using Claude API
 */
export async function processBankStatementWithAI(
  fileUrl: string
): Promise<BankStatementData> {
  // Get valid Chart of Accounts names for the prompt
  const chartAccountNames = CHART_OF_ACCOUNTS.map(acc => `"${acc.name}"`).join(", ");
  const incomeAccounts = CHART_OF_ACCOUNTS.filter(acc => acc.type === "INCOME").map(acc => `- "${acc.name}" - ${acc.description}`).join("\n    ");
  const expenseAccounts = CHART_OF_ACCOUNTS.filter(acc => acc.type === "EXPENSE").map(acc => `- "${acc.name}" - ${acc.description}`).join("\n    ");
  const assetAccounts = CHART_OF_ACCOUNTS.filter(acc => acc.type === "ASSET").map(acc => `- "${acc.name}" - ${acc.description}`).join("\n    ");
  const liabilityAccounts = CHART_OF_ACCOUNTS.filter(acc => acc.type === "LIABILITY").map(acc => `- "${acc.name}" - ${acc.description}`).join("\n    ");

  const prompt = `
    Analyze this bank statement PDF and extract ALL transactions.

    IMPORTANT: 
    1. Extract EVERY transaction shown in the statement
    2. For each transaction, determine if it's a debit (money out) or credit (money in)
    3. All amounts should be positive numbers
    4. Dates should be in ISO format (YYYY-MM-DD)
    5. Include the running balance if shown
    6. Suggest a category for each transaction based on the description

    Return the data in this exact JSON format:
    {
      "type": "bank_statement",
      "bankName": "Bank name from statement",
      "accountNumber": "Last 4 digits only (e.g., '1234')",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "openingBalance": 1000.00,
      "closingBalance": 1500.00,
      "currency": "CAD",
      "transactions": [
        {
          "date": "YYYY-MM-DD",
          "description": "Transaction description",
          "amount": 100.00,
          "type": "debit" or "credit",
          "balance": 900.00,
          "reference": "Reference number if available",
          "suggestedCategory": "Must be one of the Chart of Accounts names listed below",
          "transactionType": "Transaction type (see below)",
          "taxAmount": 15.00,
          "principalAmount": 800.00,
          "interestAmount": 200.00
        }
      ],
      "confidence": 0.95,
      "notes": "Any important notes about the statement"
    }

    CRITICAL: For suggestedCategory, you MUST use ONLY these exact Chart of Accounts names:
    ${chartAccountNames}

    TRANSACTION TYPES:
    - "income" - Revenue/sales deposits
    - "expense" - Operating expenses
    - "asset_purchase" - Equipment, furniture, computer purchases
    - "inventory_purchase" - Products for resale
    - "loan_payment" - Loan principal + interest payments
    - "credit_card_payment" - Credit card bill payments
    - "tax_payment" - Sales tax, payroll tax payments
    - "tax_collection" - Sales tax collected from customers
    - "customer_payment" - Payment received from customer (AR)
    - "vendor_payment" - Payment to supplier (AP)
    - "payroll" - Employee salary/wage payments
    - "transfer" - Between own accounts
    - "other" - Doesn't fit above categories
    
    CHART OF ACCOUNTS CATEGORIES:
    
    INCOME ACCOUNTS (for revenue/deposits):
    ${incomeAccounts}
    
    EXPENSE ACCOUNTS (for operating costs):
    ${expenseAccounts}
    
    ASSET ACCOUNTS (for balance sheet items):
    ${assetAccounts}
    
    LIABILITY ACCOUNTS (for amounts owed):
    ${liabilityAccounts}
    
    CATEGORIZATION RULES:
    - For INCOME (credits/deposits): Use "Sales Revenue" for most business income, "Other Revenue" for interest, dividends, refunds
    - For EXPENSES (debits):
      * Rent/lease → "Rent Expense"
      * Electricity/gas/water/internet/phone → "Utilities Expense"
      * Restaurant/coffee/meals → "Travel & Meals"
      * Hotels/flights/taxi/uber → "Travel & Meals"
      * Office supplies/stationery → "Office Supplies"
      * Marketing/advertising/ads → "Advertising & Marketing"
      * Legal/accounting/consulting → "Professional Fees"
      * Software/subscriptions/SaaS → "Professional Fees"
      * Insurance premiums → "Insurance Expense"
      * Employee salaries/wages → "Salaries and Wages"
      * Bank fees/charges → "Miscellaneous Expense"
      * Everything else → "Miscellaneous Expense"
    
    EXAMPLE for a restaurant expense:
    {
      "date": "2024-01-15",
      "description": "TIM HORTONS #4523",
      "amount": 25.50,
      "type": "debit",
      "balance": 1234.56,
      "suggestedCategory": "Travel & Meals",
      "transactionType": "expense"
    }
    
    EXAMPLE for a software subscription:
    {
      "date": "2024-01-20",
      "description": "ADOBE CREATIVE CLOUD",
      "amount": 79.99,
      "type": "debit",
      "balance": 1154.57,
      "suggestedCategory": "Professional Fees",
      "transactionType": "expense"
    }

    If you cannot extract valid bank statement data, return:
    {
      "type": "bank_statement",
      "currency": "CAD",
      "transactions": [],
      "confidence": 0,
      "notes": "Unable to extract bank statement data from this document"
    }
  `;

  try {
    // Fetch the file content
    const fileResponse = await fetch(fileUrl);
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Content = Buffer.from(fileBuffer).toString("base64");

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 32000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Content,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API error:", errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResponse = await response.json();

    // Validate response structure
    const validatedResponse = ClaudeResponseSchema.parse(claudeResponse);

    // Extract JSON from response
    const textContent = validatedResponse.content[0].text;
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    const preprocessedData = preprocessClaudeResponse(parsedData);

    // Validate and return the extracted data
    const validatedData = BankStatementDataSchema.parse(preprocessedData);

    return validatedData;
  } catch (error) {
    console.error("Error processing bank statement:", error);
    
    // Return a default error response
    return {
      type: "bank_statement",
      currency: "CAD",
      transactions: [],
      confidence: 0,
      notes: "Failed to process bank statement",
    };
  }
}

/**
 * Categorize a transaction based on its description
 * Returns exact Chart of Accounts category names
 */
export function categorizeTransaction(description: string, type: "debit" | "credit"): string {
  const lowerDesc = description.toLowerCase();

  if (type === "credit") {
    // Income categories - must match Chart of Accounts exactly
    if (lowerDesc.includes("deposit") || lowerDesc.includes("payment received") || 
        lowerDesc.includes("sales") || lowerDesc.includes("revenue")) {
      return "Sales Revenue";
    }
    if (lowerDesc.includes("interest") || lowerDesc.includes("dividend") || 
        lowerDesc.includes("refund") || lowerDesc.includes("rebate")) {
      return "Other Revenue";
    }
    // Default income category
    return "Sales Revenue";
  } else {
    // Expense categories - must match Chart of Accounts exactly
    if (lowerDesc.includes("rent") || lowerDesc.includes("lease")) {
      return "Rent Expense";
    }
    if (lowerDesc.includes("hydro") || lowerDesc.includes("electric") || 
        lowerDesc.includes("gas") || lowerDesc.includes("water") ||
        lowerDesc.includes("internet") || lowerDesc.includes("phone") ||
        lowerDesc.includes("telecom") || lowerDesc.includes("bell") ||
        lowerDesc.includes("rogers") || lowerDesc.includes("telus")) {
      return "Utilities Expense";
    }
    if (lowerDesc.includes("insurance") || lowerDesc.includes("premium")) {
      return "Insurance Expense";
    }
    if (lowerDesc.includes("software") || lowerDesc.includes("subscription") || 
        lowerDesc.includes("saas") || lowerDesc.includes("adobe") ||
        lowerDesc.includes("microsoft") || lowerDesc.includes("google workspace") ||
        lowerDesc.includes("legal") || lowerDesc.includes("accounting") ||
        lowerDesc.includes("consulting") || lowerDesc.includes("professional")) {
      return "Professional Fees";
    }
    if (lowerDesc.includes("office") || lowerDesc.includes("supplies") || 
        lowerDesc.includes("staples") || lowerDesc.includes("stationery")) {
      return "Office Supplies";
    }
    if (lowerDesc.includes("marketing") || lowerDesc.includes("advertising") || 
        lowerDesc.includes("ads") || lowerDesc.includes("promotion") ||
        lowerDesc.includes("facebook") || lowerDesc.includes("google ads")) {
      return "Advertising & Marketing";
    }
    if (lowerDesc.includes("meal") || lowerDesc.includes("restaurant") || 
        lowerDesc.includes("food") || lowerDesc.includes("coffee") ||
        lowerDesc.includes("lunch") || lowerDesc.includes("dinner") ||
        lowerDesc.includes("travel") || lowerDesc.includes("hotel") || 
        lowerDesc.includes("flight") || lowerDesc.includes("taxi") ||
        lowerDesc.includes("uber") || lowerDesc.includes("lyft")) {
      return "Travel & Meals";
    }
    if (lowerDesc.includes("salary") || lowerDesc.includes("wage") || 
        lowerDesc.includes("payroll") || lowerDesc.includes("employee")) {
      return "Salaries and Wages";
    }
    // Default expense category
    return "Miscellaneous Expense";
  }
}

/**
 * Validate that a category name exists in the Chart of Accounts
 */
export function isValidChartOfAccountsCategory(categoryName: string): boolean {
  return CHART_OF_ACCOUNTS.some(account => account.name === categoryName);
}