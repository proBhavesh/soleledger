/**
 * Custom hook for transaction operations
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  deleteTransaction,
  toggleTransactionReconciliation,
  updateTransaction,
  updateTransactionCategory,
} from "@/lib/actions/transaction-actions";
import type { Transaction } from "@/lib/types/dashboard";
import type {
  UpdateTransactionData,
  UpdateCategoryData,
  UpdateReconciliationData,
} from "@/lib/types/transaction-operations";

interface UseTransactionOperationsProps {
  onSuccess?: () => void;
}

export function useTransactionOperations({ onSuccess }: UseTransactionOperationsProps = {}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const handleDelete = useCallback(
    async (transactionId: string) => {
      setIsDeleting(true);
      try {
        const result = await deleteTransaction(transactionId);
        if (result.success && result.data) {
          toast.success(result.data.message);
          onSuccess?.();
          return true;
        } else {
          toast.error(result.error || "Failed to delete transaction");
          return false;
        }
      } catch {
        toast.error("An unexpected error occurred");
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess]
  );

  const handleUpdate = useCallback(
    async (data: UpdateTransactionData) => {
      setIsUpdating(true);
      try {
        const result = await updateTransaction(data);
        if (result.success && result.data) {
          toast.success("Transaction updated successfully");
          onSuccess?.();
          return true;
        } else {
          toast.error(result.error || "Failed to update transaction");
          return false;
        }
      } catch {
        toast.error("An unexpected error occurred");
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [onSuccess]
  );

  const handleCategorize = useCallback(
    async (data: UpdateCategoryData) => {
      setIsCategorizing(true);
      try {
        const result = await updateTransactionCategory(data);
        if (result.success && result.data) {
          toast.success("Category updated successfully");
          onSuccess?.();
          return true;
        } else {
          toast.error(result.error || "Failed to update category");
          return false;
        }
      } catch {
        toast.error("An unexpected error occurred");
        return false;
      } finally {
        setIsCategorizing(false);
      }
    },
    [onSuccess]
  );

  const handleReconcile = useCallback(
    async (transaction: Transaction) => {
      setIsReconciling(true);
      try {
        const data: UpdateReconciliationData = {
          transactionId: transaction.id,
          isReconciled: !transaction.reconciled,
        };
        const result = await toggleTransactionReconciliation(data);
        if (result.success && result.data) {
          toast.success(
            transaction.reconciled
              ? "Transaction marked as unreconciled"
              : "Transaction marked as reconciled"
          );
          onSuccess?.();
          return true;
        } else {
          toast.error(result.error || "Failed to update reconciliation status");
          return false;
        }
      } catch {
        toast.error("An unexpected error occurred");
        return false;
      } finally {
        setIsReconciling(false);
      }
    },
    [onSuccess]
  );

  return {
    handleDelete,
    handleUpdate,
    handleCategorize,
    handleReconcile,
    isDeleting,
    isUpdating,
    isCategorizing,
    isReconciling,
    isLoading: isDeleting || isUpdating || isCategorizing || isReconciling,
  };
}