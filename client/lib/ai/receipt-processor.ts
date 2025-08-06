import { z } from "zod";
import type { ExtractedReceiptData } from "@/lib/types/documents";
import { CHART_OF_ACCOUNTS } from "@/lib/constants/chart-of-accounts";

// Schema for receipt data extraction (using existing type)
export const ReceiptDataSchema = z.object({
  type: z.enum(["receipt", "invoice", "statement", "other"]),
  vendor: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().default("CAD"),
  date: z.string().optional(), // ISO date string
  tax: z.number().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().optional(),
        quantity: z.number().optional(),
        category: z.string().optional(),
        taxAmount: z.number().optional(),
      })
    )
    .optional(),
  suggestedSplits: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number(),
        category: z.string(),
        taxAmount: z.number().optional(),
        itemIndices: z.array(z.number()),
      })
    )
    .optional(),
  shouldSplit: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type ReceiptData = ExtractedReceiptData;

/**
 * Get Chart of Accounts relevant for receipt/invoice categorization.
 * Filters to only expense accounts and inventory (for purchases that will be resold).
 * This ensures AI doesn't incorrectly categorize receipts as assets, liabilities, equity, or income.
 */
function getReceiptRelevantAccounts() {
  return CHART_OF_ACCOUNTS.filter(account => {
    // Include all expense accounts
    if (account.type === 'EXPENSE') return true;
    
    // Include Inventory for product purchases that will be resold
    if (account.code === '1200') return true;
    
    // Exclude all other account types (other assets, liabilities, equity, income)
    return false;
  });
}

/**
 * Validate and sanitize category returned by AI.
 * Ensures the category is a valid expense account from our Chart of Accounts.
 * Returns "Miscellaneous Expense" if the category is invalid.
 */
function validateCategory(category: string | undefined): string | undefined {
  if (!category) return undefined;
  
  const validAccounts = getReceiptRelevantAccounts();
  const validAccountNames = validAccounts.map(acc => acc.name);
  
  // Check if the category is valid
  if (validAccountNames.includes(category)) {
    return category;
  }
  
  // If not valid, log a warning and default to Miscellaneous Expense
  console.warn(`Invalid category returned by AI: "${category}". Defaulting to "Miscellaneous Expense"`);
  return "Miscellaneous Expense";
}

/**
 * Create categorization rules mapping for the AI prompt.
 * Provides clear examples of how to categorize different types of expenses.
 */
function getCategorizationRules(): string {
  return `
    CATEGORIZATION RULES (match receipt items to these categories):
    
    FOOD & HOSPITALITY:
    - Restaurant bills, coffee, meals → "Travel & Meals"
    - Business lunch/dinner → "Travel & Meals"
    - Food delivery for office → "Travel & Meals"
    
    TRAVEL & TRANSPORTATION:
    - Hotels, flights, train tickets → "Travel & Meals"
    - Taxi, Uber, Lyft → "Travel & Meals"
    - Gas/fuel for business vehicles → "Travel & Meals"
    - Parking fees → "Travel & Meals"
    
    OFFICE & SUPPLIES:
    - Office supplies, stationery → "Office Supplies"
    - Printer ink, paper → "Office Supplies"
    - Small office equipment (<$500) → "Office Supplies"
    
    PROFESSIONAL SERVICES:
    - Software subscriptions, SaaS → "Professional Fees"
    - Legal services, lawyer fees → "Professional Fees"
    - Accounting, bookkeeping services → "Professional Fees"
    - Consulting services → "Professional Fees"
    - Domain names, web hosting → "Professional Fees"
    
    MARKETING & ADVERTISING:
    - Online ads (Google, Facebook, etc.) → "Advertising & Marketing"
    - Print advertising → "Advertising & Marketing"
    - Business cards, flyers → "Advertising & Marketing"
    - Trade show expenses → "Advertising & Marketing"
    
    FACILITIES & UTILITIES:
    - Office/store rent → "Rent Expense"
    - Electricity, gas, water bills → "Utilities Expense"
    - Internet, phone bills → "Utilities Expense"
    - Cleaning services → "Utilities Expense"
    
    INSURANCE:
    - Business insurance premiums → "Insurance Expense"
    - Professional liability insurance → "Insurance Expense"
    - Vehicle insurance (business) → "Insurance Expense"
    
    EMPLOYMENT:
    - Employee salaries, wages → "Salaries and Wages"
    - Contractor payments → "Salaries and Wages"
    - Payroll services → "Salaries and Wages"
    
    INVENTORY & PRODUCTS:
    - Products for resale → "Inventory" (if you resell products)
    - Raw materials for production → "Cost of Goods Sold (COGS)"
    - Direct production costs → "Cost of Goods Sold (COGS)"
    
    OTHER:
    - Bank fees, service charges → "Miscellaneous Expense"
    - Licenses, permits → "Miscellaneous Expense"
    - Everything else that doesn't fit above → "Miscellaneous Expense"
  `;
}

// Claude API response schema
const ClaudeResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal("text"),
      text: z.string(),
    })
  ),
});

// Type for unknown data that needs preprocessing
type UnknownData = Record<string, unknown> | unknown[] | unknown;

/**
 * Preprocess Claude response to handle null values
 * Convert null to undefined so Zod defaults work properly
 */
function preprocessClaudeResponse(data: UnknownData): UnknownData {
  if (data === null) return undefined;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map(preprocessClaudeResponse);
  }

  const processed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    processed[key] =
      value === null ? undefined : preprocessClaudeResponse(value);
  }
  return processed;
}

/**
 * Process a receipt image or PDF using Claude API directly.
 * 
 * This function:
 * 1. Sends the receipt to Claude AI for OCR and data extraction
 * 2. Uses a filtered list of Chart of Accounts (only expense accounts + inventory)
 * 3. Validates that returned categories are valid expense accounts
 * 4. Returns structured data with vendor, amount, date, tax, and categorized line items
 * 
 * @param fileUrl - URL of the receipt image or PDF
 * @param mimeType - MIME type of the file (image/* or application/pdf)
 * @returns Extracted receipt data with validated expense categories
 */
export async function processReceiptWithAI(
  fileUrl: string,
  mimeType: string
): Promise<ReceiptData> {
  try {
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (isImage) {
      return await processReceiptWithClaude(fileUrl, "image");
    } else if (isPdf) {
      return await processReceiptWithClaude(fileUrl, "document");
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw error;
  }
}

/**
 * Process receipt using Claude API directly
 */
async function processReceiptWithClaude(
  fileUrl: string,
  contentType: "image" | "document"
): Promise<ReceiptData> {
  // Get only receipt-relevant accounts (expenses and inventory)
  const receiptAccounts = getReceiptRelevantAccounts();
  const chartAccountNames = receiptAccounts.map(acc => `"${acc.name}"`).join(", ");
  
  // Get detailed categorization rules
  const categorizationRules = getCategorizationRules();
  
  const prompt = `
    FIRST: Determine if this ${
      contentType === "image" ? "image" : "PDF"
    } contains a receipt, invoice, or other financial/business document.
    
    If this is NOT a receipt, invoice, or financial document (e.g., it's a contract, article, personal photo, etc.), return:
    {
      "type": "other",
      "currency": "CAD",
      "confidence": 0,
      "notes": "This document does not appear to be a receipt or invoice"
    }
    
    If this IS a receipt, invoice, or financial document, analyze it and extract structured data.
    
    Return ONLY a valid JSON object with the following structure (no other text):
    {
      "type": "receipt" | "invoice" | "statement" | "other",
      "vendor": "vendor name" (omit if not found),
      "amount": number (omit if not found),
      "currency": "CAD" (or other 3-letter currency code),
      "date": "YYYY-MM-DD" (omit if not found),
      "tax": number (omit if not found),
      "items": [{"description": "string", "amount": number, "quantity": number, "category": "suggested category", "taxAmount": number}] (omit if not found),
      "shouldSplit": true/false (whether items should be separate transactions),
      "suggestedSplits": [
        {
          "description": "combined description for this transaction",
          "amount": number,
          "category": "expense category",
          "taxAmount": number,
          "itemIndices": [0, 1] (which items from items array are included)
        }
      ] (only if shouldSplit is true),
      "confidence": number between 0 and 1,
      "notes": "any additional notes or explanation" (omit if not needed)
    }
    
    Instructions for financial documents:
    - Extract vendor name, total amount, date, tax amount if visible
    - Identify the document type (receipt, invoice, statement, other)
    - List individual items with their amounts if clearly visible
    - For each item, suggest an appropriate expense category from the Chart of Accounts below
    - Analyze if items should be split into separate transactions:
      * Set shouldSplit=true if items are from different expense categories
      * Set shouldSplit=true if the receipt combines different types of purchases
      * Group similar items together in suggestedSplits
    - Provide a confidence score (0-1) based on clarity and data visibility
    - For dates, use ISO format (YYYY-MM-DD)
    - If information is unclear or missing, omit those fields entirely
    
    CRITICAL: For the "category" field, you MUST use ONLY these exact expense account names:
    ${chartAccountNames}
    
    DO NOT use any other account names like "Cash", "Accounts Payable", "Sales Revenue", etc.
    ONLY use the expense categories listed above.
    
    ${categorizationRules}
    
    SPECIFIC EXAMPLES:
    - Tim Hortons receipt → category: "Travel & Meals"
    - Starbucks coffee → category: "Travel & Meals"
    - Adobe Creative Cloud → category: "Professional Fees"
    - Microsoft 365 subscription → category: "Professional Fees"
    - Staples office supplies → category: "Office Supplies"
    - Amazon (office supplies) → category: "Office Supplies"
    - Facebook ads → category: "Advertising & Marketing"
    - Google Ads → category: "Advertising & Marketing"
    - Bell phone bill → category: "Utilities Expense"
    - Rogers internet → category: "Utilities Expense"
    - Office rent payment → category: "Rent Expense"
    - Walmart (if products for resale) → category: "Inventory"
    - Raw materials purchase → category: "Cost of Goods Sold (COGS)"
    
    Special cases:
    - If document is unclear/corrupted: confidence = 0.1-0.3
    - If document is clearly not financial: confidence = 0, type = "other"
    - If document is financial but poor quality: confidence = 0.3-0.6
    - If document is clear receipt/invoice: confidence = 0.7-1.0
  `;

  const content = [
    {
      type: contentType,
      source: {
        type: "url",
        url: fileUrl,
      },
    },
    {
      type: "text",
      text: prompt,
    },
  ];

  const requestBody = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 32000,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const claudeResponse = await response.json();
    const validatedResponse = ClaudeResponseSchema.parse(claudeResponse);

    // Extract the JSON from Claude's response
    const responseText = validatedResponse.content[0].text;

    // Try to parse JSON from the response
    let extractedData;
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in Claude response");
      }
    } catch {
      console.error("Failed to parse Claude response as JSON:", responseText);
      // Return fallback data
      return {
        type: "other",
        vendor: undefined,
        amount: undefined,
        currency: "CAD",
        date: undefined,
        tax: undefined,
        confidence: 0,
        notes: "Failed to parse response from AI",
      };
    }

    // Validate the extracted data against our schema
    const preprocessedData = preprocessClaudeResponse(extractedData);
    const validatedData = ReceiptDataSchema.parse(preprocessedData);
    
    // Additional validation: Ensure categories are valid expense accounts
    // This is a safety net in case AI returns invalid categories
    if (validatedData.items) {
      validatedData.items = validatedData.items.map(item => ({
        ...item,
        category: validateCategory(item.category)
      }));
    }
    
    if (validatedData.suggestedSplits) {
      validatedData.suggestedSplits = validatedData.suggestedSplits.map(split => ({
        ...split,
        category: validateCategory(split.category) || "Miscellaneous Expense"
      }));
    }
    
    return validatedData;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    // Return fallback data instead of throwing
    return {
      type: "other",
      vendor: undefined,
      amount: undefined,
      currency: "CAD",
      date: undefined,
      tax: undefined,
      confidence: 0,
      notes: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Match extracted receipt data with existing transactions
 */
export interface TransactionMatch {
  transactionId: string;
  confidence: number;
  matchReason: string;
}

export async function findTransactionMatches(
  receiptData: ReceiptData,
  transactions: Array<{
    id: string;
    amount: number;
    date: Date;
    description: string | null;
  }>
): Promise<TransactionMatch[]> {
  if (!receiptData.amount || !receiptData.date) {
    return [];
  }

  const receiptDate = new Date(receiptData.date);
  const receiptAmount = Math.abs(receiptData.amount);
  const matches: TransactionMatch[] = [];

  // First, look for exact or near-exact matches
  for (const transaction of transactions) {
    const transactionAmount = Math.abs(transaction.amount);
    const transactionDate = new Date(transaction.date);

    // Date matching (±7 days)
    const daysDiff = Math.abs(
      (receiptDate.getTime() - transactionDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 7) continue;

    // Amount matching (±5% tolerance)
    const amountDiff = Math.abs(receiptAmount - transactionAmount);
    const amountTolerance = transactionAmount * 0.05;

    if (amountDiff <= amountTolerance) {
      // Calculate confidence score
      let confidence = 0.5; // Base score

      // Date proximity bonus (closer = higher score)
      confidence += ((7 - daysDiff) / 7) * 0.3;

      // Amount exactness bonus
      const amountAccuracy = 1 - amountDiff / transactionAmount;
      confidence += amountAccuracy * 0.3;

      // Vendor name matching bonus
      if (receiptData.vendor && transaction.description) {
        const vendorSimilarity = calculateStringSimilarity(
          receiptData.vendor.toLowerCase(),
          transaction.description.toLowerCase()
        );
        confidence += vendorSimilarity * 0.2;
      }

      // Create match reason
      let matchReason = `Full amount match: $${receiptAmount.toFixed(
        2
      )} vs $${transactionAmount.toFixed(2)}`;
      if (daysDiff === 0) {
        matchReason += `, Same date`;
      } else {
        matchReason += `, ${daysDiff} day${daysDiff === 1 ? "" : "s"} apart`;
      }

      if (receiptData.vendor && transaction.description) {
        matchReason += `, Vendor similarity`;
      }

      matches.push({
        transactionId: transaction.id,
        confidence: Math.min(confidence, 1),
        matchReason,
      });
    }
  }

  // If we have line items, also look for partial matches
  if (receiptData.items && receiptData.items.length > 0) {
    for (const transaction of transactions) {
      // Skip if already matched as full amount
      if (matches.some(m => m.transactionId === transaction.id)) continue;

      const transactionAmount = Math.abs(transaction.amount);
      const transactionDate = new Date(transaction.date);

      // Date matching (±7 days)
      const daysDiff = Math.abs(
        (receiptDate.getTime() - transactionDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 7) continue;

      // Check if transaction matches any line item
      for (const item of receiptData.items) {
        if (!item.amount) continue;
        
        const itemAmount = Math.abs(item.amount);
        const itemDiff = Math.abs(itemAmount - transactionAmount);
        const itemTolerance = itemAmount * 0.05;
        
        if (itemDiff <= itemTolerance) {
          // Calculate confidence for partial match
          let confidence = 0.3; // Lower base for partial matches
          
          // Date proximity bonus
          confidence += ((7 - daysDiff) / 7) * 0.2;
          
          // Amount exactness bonus
          const amountAccuracy = 1 - itemDiff / itemAmount;
          confidence += amountAccuracy * 0.2;
          
          // Description matching
          if (item.description && transaction.description) {
            const descSimilarity = calculateStringSimilarity(
              item.description.toLowerCase(),
              transaction.description.toLowerCase()
            );
            confidence += descSimilarity * 0.15;
          }
          
          // Create match reason
          let matchReason = `Partial match - ${item.description || 'line item'}: $${itemAmount.toFixed(2)}`;
          matchReason += `, ${daysDiff} day${daysDiff === 1 ? "" : "s"} apart`;
          
          matches.push({
            transactionId: transaction.id,
            confidence: Math.min(confidence, 0.8), // Cap partial matches
            matchReason,
          });
          break; // Only match once per transaction
        }
      }
    }
  }

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate string similarity using simple character matching
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const matches = shorter
    .split("")
    .filter((char) => longer.includes(char)).length;
  return matches / longer.length;
}
