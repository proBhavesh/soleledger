import { z } from "zod";
import type { ExtractedReceiptData } from "@/lib/types/documents";

// Schema for receipt data extraction (using existing type)
export const ReceiptDataSchema = z.object({
  type: z.enum(["receipt", "invoice", "statement", "other"]),
  vendor: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().default("USD"),
  date: z.string().optional(), // ISO date string
  tax: z.number().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().optional(),
        quantity: z.number().optional(),
      })
    )
    .optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type ReceiptData = ExtractedReceiptData;

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
 * Process a receipt image or PDF using Claude API directly
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
  const prompt = `
    FIRST: Determine if this ${
      contentType === "image" ? "image" : "PDF"
    } contains a receipt, invoice, or other financial/business document.
    
    If this is NOT a receipt, invoice, or financial document (e.g., it's a contract, article, personal photo, etc.), return:
    {
      "type": "other",
      "currency": "USD",
      "confidence": 0,
      "notes": "This document does not appear to be a receipt or invoice"
    }
    
    If this IS a receipt, invoice, or financial document, analyze it and extract structured data.
    
    Return ONLY a valid JSON object with the following structure (no other text):
    {
      "type": "receipt" | "invoice" | "statement" | "other",
      "vendor": "vendor name" (omit if not found),
      "amount": number (omit if not found),
      "currency": "USD" (or other 3-letter currency code),
      "date": "YYYY-MM-DD" (omit if not found),
      "tax": number (omit if not found),
      "items": [{"description": "string", "amount": number, "quantity": number}] (omit if not found),
      "confidence": number between 0 and 1,
      "notes": "any additional notes or explanation" (omit if not needed)
    }
    
    Instructions for financial documents:
    - Extract vendor name, total amount, date, tax amount if visible
    - Identify the document type (receipt, invoice, statement, other)
    - List individual items if clearly visible
    - Provide a confidence score (0-1) based on clarity and data visibility
    - For dates, use ISO format (YYYY-MM-DD)
    - If information is unclear or missing, omit those fields entirely
    - Be precise and only extract information you can clearly see
    
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
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
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
        currency: "USD",
        date: undefined,
        tax: undefined,
        confidence: 0,
        notes: "Failed to parse response from AI",
      };
    }

    // Validate the extracted data against our schema
    const preprocessedData = preprocessClaudeResponse(extractedData);
    const validatedData = ReceiptDataSchema.parse(preprocessedData);
    return validatedData;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    // Return fallback data instead of throwing
    return {
      type: "other",
      vendor: undefined,
      amount: undefined,
      currency: "USD",
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

    if (amountDiff > amountTolerance) continue;

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
    let matchReason = `Amount match: $${receiptAmount.toFixed(
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
