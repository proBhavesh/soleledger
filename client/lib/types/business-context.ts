/**
 * Business context types and interfaces.
 * 
 * These types define the structure of business context data used throughout
 * the application for multi-tenant functionality. The business context
 * manages which business a user is currently working with and their
 * associated permissions.
 */

import { BusinessAccessLevel } from "./business-access";

/**
 * User's permissions for a specific business.
 * In MVP, all permissions are true for all members.
 */
export interface BusinessPermissions {
  canViewFinancials: boolean;
  canManageFinancials: boolean;
  canViewDocuments: boolean;
  canManageDocuments: boolean;
  canManageSettings: boolean;
}

/**
 * Business context for a user, including their role and permissions
 */
export interface UserBusiness {
  id: string;
  name: string;
  role: string;
  accessLevel: BusinessAccessLevel;
  isOwner: boolean;
  permissions: BusinessPermissions;
}

/**
 * Base response type for business context operations
 */
export interface BusinessContextResponse {
  success: boolean;
  error?: string;
}

/**
 * Response type for getting user businesses
 */
export interface GetUserBusinessesResponse extends BusinessContextResponse {
  businesses?: UserBusiness[];
}

/**
 * Response type for getting business details
 */
export interface GetBusinessDetailsResponse extends BusinessContextResponse {
  business?: {
    id: string;
    name: string;
    createdAt: Date;
  };
}

/**
 * Business member information including user details
 */
export interface BusinessMember {
  id: string;
  role: string;
  accessLevel?: BusinessAccessLevel;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  business: {
    id: string;
    name: string;
  };
  joinedAt?: Date | null;
  invitedAt?: Date | null;
}

/**
 * Simplified business information
 */
export interface BusinessInfo {
  id: string;
  name: string;
  role: string;
  permissions?: string[];
}

/**
 * Standard error messages for business context operations.
 * These provide consistent user-facing error messages.
 */
export const BUSINESS_CONTEXT_ERROR_MESSAGES = {
  unauthorized: "You must be logged in to perform this action",
  businessNotFound: "Business not found or access denied",
  noBusinessAccess: "You don't have access to any businesses",
  invalidBusinessId: "Invalid business ID",
  permissionDenied: "You don't have permission to access this business",
  serverError: "Failed to update business context",
  sessionExpired: "Your session has expired. Please log in again",
  businessCreationFailed: "Failed to create business",
  membershipUpdateFailed: "Failed to update membership",
} as const;

/**
 * Type for error message keys
 */
export type BusinessContextErrorType = keyof typeof BUSINESS_CONTEXT_ERROR_MESSAGES;