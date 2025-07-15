"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/lib/contexts/business-context";
import {
  createIncomeTransaction,
  createExpenseTransaction,
  createTransferTransaction,
  createTransactionWithJournal,
} from "@/lib/actions/transaction-journal-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { JournalEntryLine, CategoryOption } from "@/lib/types/journal-entries";
import { ACCOUNT_CODES } from "@/lib/constants/chart-of-accounts";

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  categories: CategoryOption[];
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  categories,
}: CreateTransactionDialogProps) {
  const { selectedBusinessId } = useBusinessContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE" | "TRANSFER" | "CUSTOM">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  
  // For simple transactions
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCashAccount, setSelectedCashAccount] = useState("");
  
  // For custom journal entries
  const [journalEntries, setJournalEntries] = useState<JournalEntryLine[]>([
    { accountId: "", debitAmount: 0, creditAmount: 0 },
    { accountId: "", debitAmount: 0, creditAmount: 0 },
  ]);

  // Get default cash account
  useEffect(() => {
    const cashAccount = categories.find(c => c.accountCode === ACCOUNT_CODES.CASH || c.name.toLowerCase().includes("cash"));
    if (cashAccount) {
      setSelectedCashAccount(cashAccount.id);
    }
  }, [categories]);

  // Calculate totals
  const totalDebits = journalEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
  const totalCredits = journalEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const addJournalEntry = () => {
    setJournalEntries([...journalEntries, { accountId: "", debitAmount: 0, creditAmount: 0 }]);
  };

  const removeJournalEntry = (index: number) => {
    if (journalEntries.length > 2) {
      setJournalEntries(journalEntries.filter((_, i) => i !== index));
    }
  };

  const updateJournalEntry = (index: number, field: keyof JournalEntryLine, value: string | number) => {
    const updated = [...journalEntries];
    updated[index] = { ...updated[index], [field]: value };
    setJournalEntries(updated);
  };

  const handleSubmit = async () => {
    if (!selectedBusinessId) {
      toast.error("No business selected");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setIsSubmitting(true);

    try {
      let result;

      if (transactionType === "CUSTOM") {
        // Validate journal entries
        const validEntries = journalEntries.filter(e => e.accountId && (e.debitAmount > 0 || e.creditAmount > 0));
        if (validEntries.length < 2) {
          toast.error("At least two journal entries are required");
          setIsSubmitting(false);
          return;
        }

        if (!isBalanced) {
          toast.error("Total debits must equal total credits");
          setIsSubmitting(false);
          return;
        }

        result = await createTransactionWithJournal({
          businessId: selectedBusinessId,
          date,
          description,
          type: "EXPENSE", // Default type for custom entries
          reference,
          notes,
          journalEntries: validEntries,
        });
      } else if (transactionType === "INCOME") {
        result = await createIncomeTransaction({
          businessId: selectedBusinessId,
          amount: parseFloat(amount),
          date,
          description,
          incomeCategoryId: selectedAccount,
          cashAccountId: selectedCashAccount,
          reference,
          notes,
        });
      } else if (transactionType === "EXPENSE") {
        result = await createExpenseTransaction({
          businessId: selectedBusinessId,
          amount: parseFloat(amount),
          date,
          description,
          expenseCategoryId: selectedAccount,
          cashAccountId: selectedCashAccount,
          reference,
          notes,
        });
      } else if (transactionType === "TRANSFER") {
        result = await createTransferTransaction({
          businessId: selectedBusinessId,
          amount: parseFloat(amount),
          date,
          description,
          fromAccountId: selectedCashAccount,
          toAccountId: selectedAccount,
          reference,
          notes,
        });
      }

      if (result?.success) {
        toast.success("Transaction created successfully");
        onOpenChange(false);
        onSuccess?.();
        
        // Reset form
        setDescription("");
        setAmount("");
        setReference("");
        setNotes("");
        setSelectedAccount("");
        setJournalEntries([
          { accountId: "", debitAmount: 0, creditAmount: 0 },
          { accountId: "", debitAmount: 0, creditAmount: 0 },
        ]);
      } else {
        toast.error(result?.error || "Failed to create transaction");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to create transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get filtered categories based on transaction type
  const getFilteredCategories = () => {
    if (transactionType === "INCOME") {
      return categories.filter(c => c.accountType === "INCOME");
    } else if (transactionType === "EXPENSE") {
      return categories.filter(c => c.accountType === "EXPENSE");
    } else if (transactionType === "TRANSFER") {
      return categories.filter(c => c.accountType === "ASSET");
    }
    return categories;
  };

  const getCashAccounts = () => {
    return categories.filter(c => c.accountType === "ASSET" && parseInt(c.accountCode) < 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
          <DialogDescription>
            Enter transaction details with proper double-entry bookkeeping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select value={transactionType} onValueChange={(value) => setTransactionType(value as "INCOME" | "EXPENSE" | "TRANSFER" | "CUSTOM")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="CUSTOM">Custom Journal Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter transaction description"
            />
          </div>

          {/* Simple Transaction Fields */}
          {transactionType !== "CUSTOM" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {transactionType === "INCOME" ? "Income Account" : 
                   transactionType === "EXPENSE" ? "Expense Account" :
                   "To Account"}
                </Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredCategories().map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.accountCode} - {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {transactionType === "TRANSFER" ? "From Account" : "Cash Account"}
                </Label>
                <Select value={selectedCashAccount} onValueChange={setSelectedCashAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cash account" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCashAccounts().map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.accountCode} - {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Custom Journal Entries */}
          {transactionType === "CUSTOM" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Journal Entries</Label>
                <Button type="button" size="sm" variant="outline" onClick={addJournalEntry}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Entry
                </Button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium">
                  <div className="col-span-5">Account</div>
                  <div className="col-span-3">Debit</div>
                  <div className="col-span-3">Credit</div>
                  <div className="col-span-1"></div>
                </div>

                {journalEntries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Select
                        value={entry.accountId}
                        onValueChange={(value) => updateJournalEntry(index, "accountId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.accountCode} - {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.debitAmount || ""}
                        onChange={(e) => updateJournalEntry(index, "debitAmount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.creditAmount || ""}
                        onChange={(e) => updateJournalEntry(index, "creditAmount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeJournalEntry(index)}
                        disabled={journalEntries.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-12 gap-2 pt-2 border-t">
                  <div className="col-span-5 text-sm font-medium">Totals</div>
                  <div className="col-span-3 text-sm font-medium">${totalDebits.toFixed(2)}</div>
                  <div className="col-span-3 text-sm font-medium">${totalCredits.toFixed(2)}</div>
                  <div className="col-span-1"></div>
                </div>
              </div>

              {!isBalanced && totalDebits > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Debits (${totalDebits.toFixed(2)}) must equal Credits (${totalCredits.toFixed(2)})
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, Invoice #, etc."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (transactionType === "CUSTOM" && !isBalanced)}
          >
            {isSubmitting ? "Creating..." : "Create Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}