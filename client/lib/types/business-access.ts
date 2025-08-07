/**
 * Business access and permission types for the SoleLedger application.
 * 
 * In the MVP version, we have simplified permissions to only support
 * FULL_MANAGEMENT access level. All team members have complete access
 * to business data. This simplification reduces complexity while we
 * validate core features.
 * 
 * Future versions may reintroduce granular permissions like:
 * - VIEW_ONLY: Read-only access
 * - FINANCIAL_ONLY: Manage transactions and reports
 * - DOCUMENTS_ONLY: Manage receipts and documents
 */

import { z } from "zod";

/**
 * Business access levels enum.
 * MVP: Only FULL_MANAGEMENT is supported.
 */
export enum BusinessAccessLevel {
  FULL_MANAGEMENT = "FULL_MANAGEMENT"
}

/**
 * Human-readable labels for access levels
 */
export const accessLevelLabels: Record<BusinessAccessLevel, string> = {
  [BusinessAccessLevel.FULL_MANAGEMENT]: "Full Management"
} as const;

/**
 * Detailed descriptions of what each access level permits
 */
export const accessLevelDescriptions: Record<BusinessAccessLevel, string> = {
  [BusinessAccessLevel.FULL_MANAGEMENT]: "Can view and modify all business data"
} as const;

/**
 * Zod schema for validating member invitation data
 */
export const inviteMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  accessLevel: z.nativeEnum(BusinessAccessLevel),
  message: z.string().optional(),
});

/**
 * Type-safe invitation data structure
 */
export interface InviteMemberData {
  email: string;
  accessLevel: BusinessAccessLevel;
  message?: string;
}

/**
 * Response type for invitation operations
 */
export interface InviteMemberResponse {
  success: boolean;
  invitationId?: string;
  error?: string;
}

/**
 * Complete business member data including user details
 */
export interface BusinessMemberWithUser {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  accessLevel: BusinessAccessLevel;
  permissions?: Record<string, unknown>;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
  inviter?: {
    id: string;
    name?: string;
    email?: string;
  };
}

/**
 * Permission check result type
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Permission configuration for MVP
 * All permissions return true as we only support FULL_MANAGEMENT
 */
export const MVP_PERMISSIONS = {
  canViewFinancials: true,
  canManageFinancials: true,
  canViewDocuments: true,
  canManageDocuments: true,
  canManageSettings: true,
} as const;

/**
 * Check if a user can view financial data.
 * MVP: Always returns true as all users have full access.
 * 
 * @returns Always true in MVP
 */
export function canViewFinancials(): boolean {
  // MVP: All team members have full access
  return MVP_PERMISSIONS.canViewFinancials;
}

/**
 * Check if a user can manage financial data.
 * MVP: Always returns true as all users have full access.
 * 
 * @returns Always true in MVP
 */
export function canManageFinancials(): boolean {
  // MVP: All team members have full access
  return MVP_PERMISSIONS.canManageFinancials;
}

/**
 * Check if a user can view documents.
 * MVP: Always returns true as all users have full access.
 * 
 * @returns Always true in MVP
 */
export function canViewDocuments(): boolean {
  // MVP: All team members have full access
  return MVP_PERMISSIONS.canViewDocuments;
}

/**
 * Check if a user can manage documents.
 * MVP: Always returns true as all users have full access.
 * 
 * @returns Always true in MVP
 */
export function canManageDocuments(): boolean {
  // MVP: All team members have full access
  return MVP_PERMISSIONS.canManageDocuments;
}

/**
 * Check if a user can manage business settings.
 * MVP: Always returns true as all users have full access.
 * 
 * @returns Always true in MVP
 */
export function canManageSettings(): boolean {
  // MVP: All team members have full access
  return MVP_PERMISSIONS.canManageSettings;
}

/**
 * Get all permissions for a given access level.
 * MVP: Returns all permissions as true.
 * 
 * @returns Object with all permissions set to true
 */
export function getPermissionsForAccessLevel() {
  return { ...MVP_PERMISSIONS };
}