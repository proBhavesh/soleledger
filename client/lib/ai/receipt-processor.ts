import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

// Schema for receipt data extraction
export const ReceiptDataSchema = z.object({
  type: z.enum(["receipt", "invoice", "statement", "other"]),
  vendor: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().default("USD"),
  date: z.string().nullable(), // ISO date string
  tax: z.number().nullable(),
  items: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().nullable(),
        quantity: z.number().nullable(),
      })
    )
    .optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type ReceiptData = z.infer<typeof ReceiptDataSchema>;

/**
 * Process a receipt image or PDF using Claude AI
 */
export async function processReceiptWithAI(
  fileUrl: string,
  mimeType: string
): Promise<ReceiptData> {
  try {
    const isImage = mimeType.startsWith("image/");

    if (isImage) {
      return await processReceiptImage(fileUrl);
    } else if (mimeType === "application/pdf") {
      // For PDFs, we'll need to convert to image first or use PDF processing
      // For now, let's handle PDFs as a text extraction task
      throw new Error("PDF processing not yet implemented");
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw error;
  }
}

/**
 * Process receipt image using Claude vision
 */
async function processReceiptImage(imageUrl: string): Promise<ReceiptData> {
  const prompt = `
    Analyze this receipt/invoice image and extract structured data. 
    
    Instructions:
    - Extract vendor name, total amount, date, tax amount if visible
    - Identify the document type (receipt, invoice, statement, other)
    - List individual items if clearly visible
    - Provide a confidence score (0-1) based on image clarity and data visibility
    - Return currency as 3-letter code (USD, EUR, etc.)
    - For dates, use ISO format (YYYY-MM-DD)
    - If information is unclear or missing, use null values
    
    Be precise and only extract information you can clearly see in the image.
  `;

  const result = await generateObject({
    model: anthropic("claude-3-5-sonnet-20241022"),
    schema: ReceiptDataSchema,
    prompt: prompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image",
            image: imageUrl,
          },
        ],
      },
    ],
  });

  return result.object;
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
