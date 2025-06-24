import { z } from "zod";

export enum BusinessAccessLevel {
  VIEW_ONLY = "VIEW_ONLY",
  FULL_MANAGEMENT = "FULL_MANAGEMENT", 
  FINANCIAL_ONLY = "FINANCIAL_ONLY",
  DOCUMENTS_ONLY = "DOCUMENTS_ONLY"
}

export const accessLevelLabels = {
  [BusinessAccessLevel.VIEW_ONLY]: "View Only",
  [BusinessAccessLevel.FULL_MANAGEMENT]: "Full Management",
  [BusinessAccessLevel.FINANCIAL_ONLY]: "Financial Management",
  [BusinessAccessLevel.DOCUMENTS_ONLY]: "Document Management"
};

export const accessLevelDescriptions = {
  [BusinessAccessLevel.VIEW_ONLY]: "Can view all data but cannot make changes",
  [BusinessAccessLevel.FULL_MANAGEMENT]: "Can view and modify all business data",
  [BusinessAccessLevel.FINANCIAL_ONLY]: "Can manage transactions, bank accounts, and financial reports",
  [BusinessAccessLevel.DOCUMENTS_ONLY]: "Can manage receipts, invoices, and document reconciliation"
};

export const inviteMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  accessLevel: z.nativeEnum(BusinessAccessLevel),
  message: z.string().optional(),
});

export interface InviteMemberData {
  email: string;
  accessLevel: BusinessAccessLevel;
  message?: string;
}

export interface InviteMemberResponse {
  success: boolean;
  invitationId?: string;
  error?: string;
}

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

// Permission helper functions
export function canViewFinancials(accessLevel: BusinessAccessLevel): boolean {
  return [
    BusinessAccessLevel.VIEW_ONLY,
    BusinessAccessLevel.FULL_MANAGEMENT,
    BusinessAccessLevel.FINANCIAL_ONLY
  ].includes(accessLevel);
}

export function canManageFinancials(accessLevel: BusinessAccessLevel): boolean {
  return [
    BusinessAccessLevel.FULL_MANAGEMENT,
    BusinessAccessLevel.FINANCIAL_ONLY
  ].includes(accessLevel);
}

export function canViewDocuments(accessLevel: BusinessAccessLevel): boolean {
  return [
    BusinessAccessLevel.VIEW_ONLY,
    BusinessAccessLevel.FULL_MANAGEMENT,
    BusinessAccessLevel.DOCUMENTS_ONLY
  ].includes(accessLevel);
}

export function canManageDocuments(accessLevel: BusinessAccessLevel): boolean {
  return [
    BusinessAccessLevel.FULL_MANAGEMENT,
    BusinessAccessLevel.DOCUMENTS_ONLY
  ].includes(accessLevel);
}

export function canManageSettings(accessLevel: BusinessAccessLevel): boolean {
  return accessLevel === BusinessAccessLevel.FULL_MANAGEMENT;
}