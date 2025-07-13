import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  errors?: string[];
}

/**
 * Parse CSV file content
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          const errors = result.errors.map(e => e.message);
          resolve({
            headers: result.meta.fields || [],
            rows: result.data as ParsedRow[],
            errors,
          });
        } else {
          resolve({
            headers: result.meta.fields || [],
            rows: result.data as ParsedRow[],
          });
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Parse Excel file content
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Get formatted strings
          dateNF: "yyyy-mm-dd", // Date format
        });
        
        // Get headers from the first row
        const headers = jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null
          ? Object.keys(jsonData[0] as Record<string, unknown>)
          : [];
        
        resolve({
          headers,
          rows: jsonData as ParsedRow[],
        });
      } catch (error) {
        reject(new Error(`Excel parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read Excel file"));
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse CSV or Excel file based on file type
 */
export async function parseSpreadsheet(file: File): Promise<ParseResult> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === "text/csv" || fileName.endsWith(".csv")) {
    return parseCSV(file);
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileType === "application/vnd.ms-excel" ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  ) {
    return parseExcel(file);
  } else {
    throw new Error("Unsupported file type. Please upload a CSV or Excel file.");
  }
}

/**
 * Validate parsed data for transaction import
 */
export function validateTransactionData(
  rows: ParsedRow[],
  requiredFields: { date: string; amount: string; description: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (rows.length === 0) {
    errors.push("No data found in file");
    return { valid: false, errors };
  }
  
  // Check if required fields exist in the first row
  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  
  if (!headers.includes(requiredFields.date)) {
    errors.push(`Date column "${requiredFields.date}" not found`);
  }
  
  if (!headers.includes(requiredFields.amount)) {
    errors.push(`Amount column "${requiredFields.amount}" not found`);
  }
  
  if (!headers.includes(requiredFields.description)) {
    errors.push(`Description column "${requiredFields.description}" not found`);
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Validate each row
  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because of header row and 0-based index
    
    // Check date
    const dateValue = row[requiredFields.date];
    if (!dateValue || !isValidDate(String(dateValue))) {
      errors.push(`Row ${rowNum}: Invalid or missing date`);
    }
    
    // Check amount
    const amountValue = row[requiredFields.amount];
    if (amountValue === null || amountValue === undefined || isNaN(Number(amountValue))) {
      errors.push(`Row ${rowNum}: Invalid or missing amount`);
    }
    
    // Check description
    const descValue = row[requiredFields.description];
    if (!descValue || String(descValue).trim() === "") {
      errors.push(`Row ${rowNum}: Missing description`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors: errors.slice(0, 10), // Limit to first 10 errors
  };
}

/**
 * Check if a string is a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format parsed data for transaction import
 */
export function formatTransactionData(
  rows: ParsedRow[],
  columnMapping: {
    date: string;
    description: string;
    amount: string;
    category?: string;
    reference?: string;
    notes?: string;
  }
): Array<{
  date: string;
  description: string;
  amount: number;
  category?: string;
  reference?: string;
  notes?: string;
}> {
  return rows.map((row) => {
    const date = new Date(String(row[columnMapping.date]));
    const formattedDate = date.toISOString().split("T")[0]; // YYYY-MM-DD
    
    return {
      date: formattedDate,
      description: String(row[columnMapping.description] || ""),
      amount: Number(row[columnMapping.amount]) || 0,
      category: columnMapping.category ? String(row[columnMapping.category] || "") : undefined,
      reference: columnMapping.reference ? String(row[columnMapping.reference] || "") : undefined,
      notes: columnMapping.notes ? String(row[columnMapping.notes] || "") : undefined,
    };
  });
}