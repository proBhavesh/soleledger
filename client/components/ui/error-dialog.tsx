"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  errors?: Array<{ row?: number; error: string }>;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title = "Error",
  description,
  errors,
}: ErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
          {errors && errors.length > 0 && (
            <div className="mt-4 max-h-[300px] overflow-y-auto">
              <p className="text-sm font-medium mb-2">Error details:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {errors.map((error, index) => (
                  <li key={index} className="flex gap-2">
                    {error.row && <span className="font-medium">Row {error.row}:</span>}
                    <span>{error.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}