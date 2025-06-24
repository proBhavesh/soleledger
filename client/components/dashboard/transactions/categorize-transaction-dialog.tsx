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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  getBusinessCategories, 
  updateTransactionCategory 
} from "@/lib/actions/transaction-actions";
import type { Category } from "@/generated/prisma";
import type { CategorizeTransactionDialogProps } from "@/lib/types/transaction-operations";

export function CategorizeTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: CategorizeTransactionDialogProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      if (!open) return;
      
      setIsLoading(true);
      try {
        const result = await getBusinessCategories();
        if (result.success && result.data?.categories) {
          setCategories(result.data.categories);
          
          // Set current category if available
          if (transaction?.categoryId) {
            setSelectedCategory(transaction.categoryId);
          }
        } else {
          toast.error("Failed to load categories");
        }
      } catch {
        toast.error("Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, [open, transaction]);

  const handleSubmit = async () => {
    if (!selectedCategory || !transaction) return;

    setIsSubmitting(true);
    try {
      const result = await updateTransactionCategory({
        transactionId: transaction.id,
        categoryId: selectedCategory,
      });

      if (result.success && result.data) {
        toast.success("Category updated successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } catch {
      toast.error("Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Categorize Transaction</DialogTitle>
          <DialogDescription>
            Select a category for this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={popoverOpen}
                className="w-full justify-between"
                disabled={isLoading}
              >
                {isLoading
                  ? "Loading categories..."
                  : selectedCategoryData
                  ? `${selectedCategoryData.accountCode} - ${selectedCategoryData.name}`
                  : "Select category..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search category..." />
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandList>
                  {["EXPENSE", "INCOME", "ASSET", "LIABILITY", "EQUITY"].map((type) => {
                    const typeCategories = categories.filter(c => c.accountType === type);
                    if (typeCategories.length === 0) return null;

                    return (
                      <CommandGroup key={type} heading={type}>
                        {typeCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={`${category.accountCode} ${category.name}`}
                            onSelect={() => {
                              setSelectedCategory(category.id);
                              setPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCategory === category.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="font-mono text-sm">{category.accountCode}</span>
                            <span className="ml-2">{category.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    );
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCategory || isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}