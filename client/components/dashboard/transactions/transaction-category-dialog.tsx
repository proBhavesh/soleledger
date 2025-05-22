"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Check, ChevronsUpDown, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Category } from "@/lib/types/dashboard";

interface TransactionCategoryDialogProps {
  currentCategory?: string;
  onCategoryChange: (categoryId: string) => Promise<boolean>;
  trigger?: React.ReactNode;
}

export function TransactionCategoryDialog({
  currentCategory,
  onCategoryChange,
  trigger,
}: TransactionCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch categories from API
    async function fetchCategories() {
      setIsLoading(true);
      try {
        // Simulating category fetch - replace with actual API call
        // const response = await fetch('/api/categories');
        // const data = await response.json();

        // Mock data for now - replace with real API call
        const mockCategories: Category[] = [
          {
            id: "cat1",
            name: "Housing",
            type: "EXPENSE",
            description: "Rent, mortgage, utilities",
          },
          {
            id: "cat2",
            name: "Food",
            type: "EXPENSE",
            description: "Groceries, dining out",
          },
          {
            id: "cat3",
            name: "Transportation",
            type: "EXPENSE",
            description: "Gas, public transit",
          },
          {
            id: "cat4",
            name: "Entertainment",
            type: "EXPENSE",
            description: "Movies, events",
          },
          {
            id: "cat5",
            name: "Shopping",
            type: "EXPENSE",
            description: "Clothing, electronics",
          },
          {
            id: "cat6",
            name: "Health",
            type: "EXPENSE",
            description: "Medical bills, pharmacy",
          },
          {
            id: "cat7",
            name: "Income",
            type: "INCOME",
            description: "Salary, freelance",
          },
          {
            id: "cat8",
            name: "Investments",
            type: "INCOME",
            description: "Dividends, returns",
          },
        ];

        setCategories(mockCategories);

        // If current category is provided, set it as selected
        if (currentCategory) {
          const found = mockCategories.find((c) => c.name === currentCategory);
          if (found) {
            setSelectedCategory(found.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (open) {
      fetchCategories();
    }
  }, [open, currentCategory]);

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const success = await onCategoryChange(selectedCategory);
      if (success) {
        toast.success("Transaction category updated");
        setOpen(false);
      } else {
        toast.error("Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("An error occurred while updating the category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Tag className="h-4 w-4 mr-2" />
            Categorize
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Transaction Category</DialogTitle>
          <DialogDescription>
            Categorize this transaction to better track your finances.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Category</h4>

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
                    : selectedCategory
                    ? categories.find(
                        (category) => category.id === selectedCategory
                      )?.name
                    : "Select category..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup heading="Expense Categories">
                      {categories
                        .filter((category) => category.type === "EXPENSE")
                        .map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.id}
                            onSelect={(currentValue: string) => {
                              setSelectedCategory(
                                currentValue === selectedCategory
                                  ? ""
                                  : currentValue
                              );
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
                            {category.name}
                            {category.description && (
                              <span className="ml-1 text-muted-foreground text-xs">
                                — {category.description}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandGroup heading="Income Categories">
                      {categories
                        .filter((category) => category.type === "INCOME")
                        .map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.id}
                            onSelect={(currentValue: string) => {
                              setSelectedCategory(
                                currentValue === selectedCategory
                                  ? ""
                                  : currentValue
                              );
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
                            {category.name}
                            {category.description && (
                              <span className="ml-1 text-muted-foreground text-xs">
                                — {category.description}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCategory || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Updating..." : "Update Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
