"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2 } from "lucide-react";
import { CHART_OF_ACCOUNTS } from "@/lib/constants/chart-of-accounts";
import type { ChartOfAccountsProgressDialogProps } from "@/lib/types/chart-of-accounts";

const ANIMATION_DURATION_PER_ACCOUNT = 100; // ms
const COMPLETION_DELAY = 1500; // ms

/**
 * Dialog component that displays progress while Chart of Accounts is being created.
 * Shows a progress bar and animates through each account being created.
 * 
 * @param {ChartOfAccountsProgressDialogProps} props - Component props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onComplete - Callback fired when creation is complete
 */
export function ChartOfAccountsProgressDialog({
  open,
  onComplete,
}: ChartOfAccountsProgressDialogProps) {
  const [progress, setProgress] = useState(0);
  const [currentAccount, setCurrentAccount] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setProgress(0);
      setCurrentAccount("");
      setIsComplete(false);
    }
  }, [open]);

  // Handle the progress animation
  useEffect(() => {
    if (!open) return;

    const totalAccounts = CHART_OF_ACCOUNTS.length;
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < totalAccounts) {
        const account = CHART_OF_ACCOUNTS[currentIndex];
        setCurrentAccount(`${account.code} - ${account.name}`);
        setProgress(((currentIndex + 1) / totalAccounts) * 100);
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        
        // Call onComplete after a delay
        const completeTimer = setTimeout(() => {
          onComplete?.();
        }, COMPLETION_DELAY);
        
        return () => clearTimeout(completeTimer);
      }
    }, ANIMATION_DURATION_PER_ACCOUNT);

    return () => clearInterval(interval);
  }, [open, onComplete]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Chart of Accounts Created
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting Up Your Chart of Accounts
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? "Your accounting structure is ready!"
              : "Creating standard accounts for your business..."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Progress value={progress} className="h-2" />
          <div className="text-sm text-muted-foreground min-h-[20px]">
            {!isComplete && currentAccount && (
              <span className="animate-pulse">Creating: {currentAccount}</span>
            )}
            {isComplete && (
              <span className="text-green-600 font-medium">
                ✓ {CHART_OF_ACCOUNTS.length} accounts created successfully
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}