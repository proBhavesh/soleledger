import { z } from "zod";
import type { 
  InvitationType as PrismaInvitationType, 
  InvitationStatus as PrismaInvitationStatus,
  BusinessAccessLevel 
} from "@/generated/prisma";

// Zod schemas for validation
export const createClientInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  clientName: z.string().min(1, "Client name is required"),
  businessName: z.string().min(1, "Business name is required"),
  accessLevel: z.enum(["FULL_MANAGEMENT"]), // MVP: Only full management
  sendNotification: z.boolean().default(true),
});

export const acceptInvitationSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  confirmBusinessCreation: z.boolean().optional(),
});

// Schema for invitation token validation
export const invitationTokenSchema = z.object({
  token: z.string().min(20, "Invalid token format"),
});

// Schema for resend/cancel invitation operations
export const invitationIdSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
});

// Type exports
export type InvitationType = PrismaInvitationType;
export type InvitationStatus = PrismaInvitationStatus;

// Component prop validation schemas
export const invitationComponentPropsSchema = z.object({
  token: z.string().min(20),
  invitation: z.object({
    email: z.string().email(),
    clientName: z.string(),
    businessName: z.string(),
    senderName: z.string(),
    senderEmail: z.string().email().optional(),
    accessLevel: z.string(),
    invitationType: z.enum(["NEW_USER", "EXISTING_NO_BUSINESS", "EXISTING_WITH_BUSINESS"]),
    hasExistingUser: z.boolean().optional(),
  }),
  onSuccess: z.function().args().returns(z.void()),
});

export type CreateClientInvitationData = z.infer<typeof createClientInvitationSchema>;

export interface CreateClientInvitationResponse {
  success: boolean;
  error?: string;
  invitationId?: string;
  invitationType?: InvitationType;
}

export interface InvitationValidationResponse {
  invitation: {
    id: string;
    email: string;
    clientName: string;
    businessName: string;
    invitationType: InvitationType;
    accessLevel: BusinessAccessLevel;
    senderName: string;
    senderEmail: string;
    expiresAt: string;
    hasExistingUser: boolean;
  };
}

export interface AcceptInvitationData {
  password?: string;
  confirmBusinessCreation?: boolean;
}

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  redirectTo: string;
}

export interface InvitationListItem {
  id: string;
  email: string;
  status: InvitationStatus;
  invitationType: InvitationType;
  businessName?: string;
  clientName?: string;
  accessLevel: string;
  createdAt: string;
  expiresAt: string;
  receiver?: {
    id: string;
    email: string;
    name?: string;
  };
  business?: {
    name: string;
  };
}

export interface GetInvitationsResponse {
  success: boolean;
  error?: string;
  invitations?: InvitationListItem[];
}

export interface ResendInvitationResponse {
  success: boolean;
  error?: string;
}

export interface CancelInvitationResponse {
  success: boolean;
  error?: string;
}

export interface RejectInvitationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Email template parameter schemas
export const newUserEmailParamsSchema = z.object({
  accountantName: z.string().min(1),
  clientName: z.string().min(1),
  businessName: z.string().min(1),
  invitationUrl: z.string().url(),
  expiresAt: z.string(),
});

export const existingUserNoBusinessEmailParamsSchema = z.object({
  accountantName: z.string().min(1),
  clientName: z.string().min(1),
  businessName: z.string().min(1),
  invitationUrl: z.string().url(),
  expiresAt: z.string(),
});

export const existingUserWithBusinessEmailParamsSchema = z.object({
  accountantName: z.string().min(1),
  accountantEmail: z.string().email(),
  clientName: z.string().min(1),
  businessName: z.string().min(1),
  accessLevel: z.string(),
  invitationUrl: z.string().url(),
  expiresAt: z.string(),
});

// Access level information for UI - Simplified for MVP
export const ACCESS_LEVEL_INFO = {
  FULL_MANAGEMENT: {
    label: "Full Management",
    description: "Complete access to manage all aspects",
    permissions: [
      "Create and edit transactions",
      "Manage bank accounts",
      "Process documents and receipts",
      "Generate and export reports",
      "Manage chart of accounts",
    ],
  },
} as const;

export type AccessLevelKey = keyof typeof ACCESS_LEVEL_INFO;