"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { ParsedRow } from "@/lib/utils/csv-excel-parser";

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  category?: string;
  reference?: string;
  notes?: string;
}

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  previewRows: ParsedRow[];
  fileName: string;
  onConfirm: (mapping: ColumnMapping) => void;
  isLoading?: boolean;
}

export function ColumnMappingDialog({
  open,
  onOpenChange,
  headers,
  previewRows,
  fileName,
  onConfirm,
  isLoading = false,
}: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Auto-detect common column names
  useEffect(() => {
    if (headers.length === 0) return;

    const lowerHeaders = headers.map(h => h.toLowerCase());
    const newMapping: ColumnMapping = {
      date: "",
      description: "",
      amount: "",
    };

    // Try to auto-detect date column
    const datePatterns = ["date", "transaction date", "trans date", "posted date"];
    for (const pattern of datePatterns) {
      const index = lowerHeaders.findIndex(h => h.includes(pattern));
      if (index !== -1) {
        newMapping.date = headers[index];
        break;
      }
    }

    // Try to auto-detect description column
    const descPatterns = ["description", "desc", "memo", "payee", "merchant"];
    for (const pattern of descPatterns) {
      const index = lowerHeaders.findIndex(h => h.includes(pattern));
      if (index !== -1) {
        newMapping.description = headers[index];
        break;
      }
    }

    // Try to auto-detect amount column
    const amountPatterns = ["amount", "value", "total", "debit", "credit"];
    for (const pattern of amountPatterns) {
      const index = lowerHeaders.findIndex(h => h.includes(pattern));
      if (index !== -1) {
        newMapping.amount = headers[index];
        break;
      }
    }

    // Try to auto-detect category column
    const categoryPatterns = ["category", "type", "class"];
    for (const pattern of categoryPatterns) {
      const index = lowerHeaders.findIndex(h => h.includes(pattern));
      if (index !== -1) {
        newMapping.category = headers[index];
        break;
      }
    }

    // Try to auto-detect reference column
    const refPatterns = ["reference", "ref", "check", "invoice"];
    for (const pattern of refPatterns) {
      const index = lowerHeaders.findIndex(h => h.includes(pattern));
      if (index !== -1) {
        newMapping.reference = headers[index];
        break;
      }
    }

    setMapping(newMapping);
  }, [headers]);

  const handleMappingChange = (field: keyof ColumnMapping, value: string | undefined) => {
    setMapping(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]); // Clear errors on change
  };

  const validateMapping = (): boolean => {
    const errors: string[] = [];

    if (!mapping.date) {
      errors.push("Date column is required");
    }
    if (!mapping.description) {
      errors.push("Description column is required");
    }
    if (!mapping.amount) {
      errors.push("Amount column is required");
    }

    // Check for duplicate mappings
    const mappedColumns = Object.values(mapping).filter(Boolean);
    const uniqueColumns = new Set(mappedColumns);
    if (mappedColumns.length !== uniqueColumns.size) {
      errors.push("Each column can only be mapped once");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleConfirm = () => {
    if (validateMapping()) {
      onConfirm(mapping);
    }
  };

  // Generate preview data based on current mapping
  const getPreviewValue = (row: ParsedRow, columnName: string) => {
    if (!columnName) return "-";
    const value = row[columnName];
    return value !== null && value !== undefined ? String(value) : "-";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Columns for Import</DialogTitle>
          <DialogDescription>
            Map the columns from your file &quot;{fileName}&quot; to the transaction fields.
            We&apos;ve tried to auto-detect common columns.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Column Mapping Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-column">
                Date Column <span className="text-red-500">*</span>
              </Label>
              <Select
                value={mapping.date}
                onValueChange={(value) => handleMappingChange("date", value)}
              >
                <SelectTrigger id="date-column">
                  <SelectValue placeholder="Select date column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc-column">
                Description Column <span className="text-red-500">*</span>
              </Label>
              <Select
                value={mapping.description}
                onValueChange={(value) => handleMappingChange("description", value)}
              >
                <SelectTrigger id="desc-column">
                  <SelectValue placeholder="Select description column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-column">
                Amount Column <span className="text-red-500">*</span>
              </Label>
              <Select
                value={mapping.amount}
                onValueChange={(value) => handleMappingChange("amount", value)}
              >
                <SelectTrigger id="amount-column">
                  <SelectValue placeholder="Select amount column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-column">
                Category Column (Optional)
              </Label>
              <Select
                value={mapping.category || "none"}
                onValueChange={(value) => handleMappingChange("category", value === "none" ? undefined : value)}
              >
                <SelectTrigger id="category-column">
                  <SelectValue placeholder="Select category column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref-column">
                Reference Column (Optional)
              </Label>
              <Select
                value={mapping.reference || "none"}
                onValueChange={(value) => handleMappingChange("reference", value === "none" ? undefined : value)}
              >
                <SelectTrigger id="ref-column">
                  <SelectValue placeholder="Select reference column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes-column">
                Notes Column (Optional)
              </Label>
              <Select
                value={mapping.notes || "none"}
                onValueChange={(value) => handleMappingChange("notes", value === "none" ? undefined : value)}
              >
                <SelectTrigger id="notes-column">
                  <SelectValue placeholder="Select notes column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Section */}
          <div className="space-y-2">
            <Label>Preview (First 5 rows)</Label>
            <div className="border rounded-md overflow-hidden">
              <div className="h-[200px] overflow-auto">
                <div className="min-w-[600px]">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    {mapping.category && <TableHead>Category</TableHead>}
                    {mapping.reference && <TableHead>Reference</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {getPreviewValue(row, mapping.date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getPreviewValue(row, mapping.description)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {getPreviewValue(row, mapping.amount)}
                      </TableCell>
                      {mapping.category && (
                        <TableCell className="text-sm">
                          {getPreviewValue(row, mapping.category)}
                        </TableCell>
                      )}
                      {mapping.reference && (
                        <TableCell className="text-sm">
                          {getPreviewValue(row, mapping.reference)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Ready to import {previewRows.length} transactions from {fileName}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Importing..." : "Import Transactions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}