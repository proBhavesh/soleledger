"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { createManualBankAccount } from "@/lib/actions/bank-account-actions";
import { 
  BankAccountType, 
  BANK_ACCOUNT_TYPE_LABELS,
  createManualBankAccountSchema 
} from "@/lib/types/bank-accounts";

/**
 * Props for the CreateManualAccountDialog component
 * @property {boolean} open - Controls dialog visibility
 * @property {function} onOpenChange - Callback when dialog open state changes
 * @property {function} onSuccess - Optional callback when account is successfully created
 */
interface CreateManualAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/** Type for the form data based on the Zod schema */
type FormData = z.infer<typeof createManualBankAccountSchema>;

/**
 * Dialog component for creating manual bank accounts
 * Provides a form for users to add bank accounts from institutions not supported by Plaid
 * 
 * @param {CreateManualAccountDialogProps} props - Component props
 * @returns {JSX.Element} The rendered dialog component
 */
export function CreateManualAccountDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateManualAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(createManualBankAccountSchema),
    defaultValues: {
      accountType: BankAccountType.CHECKING,
      balance: 0,
      currency: "CAD",
    },
  });

  const selectedAccountType = watch("accountType");

  /**
   * Handles form submission to create a new manual bank account
   * @param {FormData} data - The validated form data
   */
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createManualBankAccount(data);

      if (result.success) {
        toast.success("Bank account created successfully");
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error || "Failed to create bank account. Please try again.");
      }
    } catch (error) {
      console.error("Error creating bank account:", error);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles dialog close action
   * Prevents closing while form is submitting and resets form state
   */
  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Manual Bank Account</DialogTitle>
          <DialogDescription>
            Create a bank account for institutions not supported by automatic bank feeds.
            You&apos;ll need to manually upload statements to keep transactions up to date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Account Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Business Checking"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type *</Label>
            <Select
              value={selectedAccountType}
              onValueChange={(value) => setValue("accountType", value as BankAccountType)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="accountType">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BANK_ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.accountType && (
              <p className="text-sm text-destructive">{errors.accountType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution Name *</Label>
            <Input
              id="institution"
              {...register("institution")}
              placeholder="e.g., Rural Credit Union"
              disabled={isSubmitting}
            />
            {errors.institution && (
              <p className="text-sm text-destructive">{errors.institution.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">
              Account Number (Optional)
              <span className="text-xs text-muted-foreground ml-2">
                Last 4 digits recommended for security
              </span>
            </Label>
            <Input
              id="accountNumber"
              {...register("accountNumber")}
              placeholder="e.g., ****1234"
              disabled={isSubmitting}
            />
            {errors.accountNumber && (
              <p className="text-sm text-destructive">{errors.accountNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">
              Current Balance *
              <span className="text-xs text-muted-foreground ml-2">
                {selectedAccountType === BankAccountType.CREDIT_CARD || 
                 selectedAccountType === BankAccountType.LINE_OF_CREDIT || 
                 selectedAccountType === BankAccountType.LOAN
                  ? "Enter as negative for amounts owed"
                  : "Enter current account balance"}
              </span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="balance"
                type="number"
                step="0.01"
                {...register("balance", { valueAsNumber: true })}
                className="pl-8"
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            {errors.balance && (
              <p className="text-sm text-destructive">{errors.balance.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={watch("currency")}
              onValueChange={(value) => setValue("currency", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}