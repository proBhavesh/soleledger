import { z } from "zod";

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
          "suggestedCategory": "Suggested category based on description",
          "transactionType": "Transaction type (see above)",
          "taxAmount": 15.00,
          "principalAmount": 800.00,
          "interestAmount": 200.00
        }
      ],
      "confidence": 0.95,
      "notes": "Any important notes about the statement"
    }

    IMPORTANT: Analyze each transaction carefully and assign the appropriate category AND transactionType:
    
    For suggestedCategory, use the exact account name from Chart of Accounts.
    For transactionType, identify the nature of the transaction:
    
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
    
    INCOME ACCOUNTS (for revenue/deposits):
    - "Sales Revenue" - Product sales
    - "Service Revenue" - Service income
    - "Interest Income" - Interest earned
    - "Other Income" - Miscellaneous income
    
    EXPENSE ACCOUNTS (for operating costs):
    - "Cost of Goods Sold" - Direct product costs
    - "Salaries & Wages" - Employee compensation
    - "Rent" - Office/store rent
    - "Utilities" - Electricity, gas, water
    - "Office Supplies" - Consumables
    - "Advertising & Marketing" - Marketing costs
    - "Travel" - Business travel
    - "Meals & Entertainment" - Business meals
    - "Professional Fees" - Legal, accounting
    - "Insurance" - Business insurance
    - "Telephone" - Phone bills
    - "Internet" - Internet service
    - "Software Subscriptions" - SaaS, software
    - "Fuel" - Vehicle fuel
    - "Vehicle Maintenance" - Auto repairs
    - "Interest Expense" - Loan interest
    - "Bank Charges" - Bank fees
    - "Credit Card Fees" - Processing fees
    - "Depreciation" - Asset depreciation
    - "Miscellaneous" - Other expenses
    
    ASSET ACCOUNTS (for purchases that create assets):
    - "Office Equipment" - Computers, printers
    - "Furniture & Fixtures" - Desks, chairs
    - "Vehicles" - Company vehicles
    - "Inventory" - Products for resale
    - "Prepaid Insurance" - Insurance paid in advance
    - "Prepaid Rent" - Rent paid in advance
    
    LIABILITY ACCOUNTS (for amounts owed):
    - "Credit Cards" - Credit card balances
    - "Loans Payable" - Loan principal
    - "Sales Tax Payable" - Tax collected
    - "Payroll Tax Payable" - Payroll taxes owed
    
    RECOGNITION PATTERNS:
    - Equipment/computer/furniture purchase → transactionType: "asset_purchase", suggestedCategory: "Office Equipment"
    - Inventory/products for resale → transactionType: "inventory_purchase", suggestedCategory: "Inventory"
    - Loan payment → transactionType: "loan_payment", needs to be split between principal and interest
    - Sales with tax → transactionType: "income", note the tax amount separately
    - Payroll → transactionType: "payroll", suggestedCategory: "Salaries & Wages"
    - Tax payment to government → transactionType: "tax_payment"
    - Transfer between accounts → transactionType: "transfer"
    
    Add a "transactionType" field to each transaction in your response.

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
 */
export function categorizeTransaction(description: string, type: "debit" | "credit"): string {
  const lowerDesc = description.toLowerCase();

  if (type === "credit") {
    // Income categories
    if (lowerDesc.includes("deposit") || lowerDesc.includes("payment received")) {
      return "Sales";
    }
    if (lowerDesc.includes("service") || lowerDesc.includes("consulting")) {
      return "Service Income";
    }
    if (lowerDesc.includes("transfer in") || lowerDesc.includes("e-transfer")) {
      return "Transfer";
    }
    return "Other Income";
  } else {
    // Expense categories
    if (lowerDesc.includes("rent") || lowerDesc.includes("lease")) {
      return "Rent";
    }
    if (lowerDesc.includes("hydro") || lowerDesc.includes("electric") || lowerDesc.includes("gas") || lowerDesc.includes("water")) {
      return "Utilities";
    }
    if (lowerDesc.includes("insurance")) {
      return "Insurance";
    }
    if (lowerDesc.includes("software") || lowerDesc.includes("subscription") || lowerDesc.includes("saas")) {
      return "Software";
    }
    if (lowerDesc.includes("office") || lowerDesc.includes("supplies") || lowerDesc.includes("staples")) {
      return "Office";
    }
    if (lowerDesc.includes("professional") || lowerDesc.includes("legal") || lowerDesc.includes("accounting")) {
      return "Professional Fees";
    }
    if (lowerDesc.includes("marketing") || lowerDesc.includes("advertising") || lowerDesc.includes("ads")) {
      return "Marketing";
    }
    if (lowerDesc.includes("meal") || lowerDesc.includes("restaurant") || lowerDesc.includes("food")) {
      return "Meals";
    }
    if (lowerDesc.includes("travel") || lowerDesc.includes("hotel") || lowerDesc.includes("flight")) {
      return "Travel";
    }
    if (lowerDesc.includes("transfer out") || lowerDesc.includes("e-transfer")) {
      return "Transfer";
    }
    return "Other Expense";
  }
}