/**
 * Types for business context-related actions and responses
 */

export interface BusinessContextResponse {
  success: boolean;
  error?: string;
}

export interface BusinessMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  business: {
    id: string;
    name: string;
  };
}

export interface BusinessInfo {
  id: string;
  name: string;
  role: string;
  permissions?: string[];
}

// Error messages for business context operations
export const BUSINESS_CONTEXT_ERROR_MESSAGES = {
  unauthorized: "You must be logged in to perform this action",
  businessNotFound: "Business not found or access denied",
  noBusinessAccess: "You don't have access to any businesses",
  invalidBusinessId: "Invalid business ID",
  permissionDenied: "You don't have permission to access this business",
  serverError: "Failed to update business context",
} as const;