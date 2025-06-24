/**
 * Error handling utilities
 */

import { TransactionOperationError } from "@/lib/types/transaction-operations";

/**
 * Parse error and return user-friendly message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof TransactionOperationError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return "An unexpected error occurred";
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes("network") ||
      error.message.toLowerCase().includes("fetch") ||
      error.message.toLowerCase().includes("connection")
    );
  }
  return false;
}

/**
 * Check if error is an authorization error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof TransactionOperationError) {
    return error.code === "UNAUTHORIZED" || error.code === "PERMISSION_DENIED";
  }
  
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes("unauthorized") ||
      error.message.toLowerCase().includes("permission") ||
      error.message.toLowerCase().includes("forbidden")
    );
  }
  
  return false;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: TransactionOperationError["code"],
  message: string,
  details?: unknown
) {
  return {
    success: false,
    error: message,
    errorCode: code,
    details,
  };
}