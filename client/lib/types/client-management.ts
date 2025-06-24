import { z } from "zod";

export const createClientBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Valid email is required"),
  description: z.string().optional(),
});

export interface CreateClientBusinessResponse {
  success: boolean;
  businessId?: string;
  error?: string;
}

export interface SendInvitationResponse {
  success: boolean;
  error?: string;
}

export type CreateClientBusinessData = z.infer<typeof createClientBusinessSchema>;