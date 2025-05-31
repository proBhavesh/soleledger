"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
});

const updateBusinessProfileSchema = z.object({
  businessName: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().max(200).optional().or(z.literal("")),
});

export interface UserProfile {
  name: string;
  email: string;
  image: string | null;
  role: string;
  emailVerified: Date | null;
  createdAt: Date;
}

export interface BusinessProfile {
  businessName: string | null;
  industry: string | null;
  address: string | null;
  taxId: string | null;
  phone: string | null;
  website: string | null;
}

export interface BusinessStats {
  totalTransactions: number;
  totalDocuments: number;
  totalBankAccounts: number;
}

/**
 * Get user profile information
 */
export async function getUserProfile(): Promise<{
  success: boolean;
  data?: UserProfile;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      data: {
        name: user.name || "",
        email: user.email || "",
        image: user.image,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return { success: false, error: "Failed to get user profile" };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  data: z.infer<typeof updateProfileSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateProfileSchema.parse(data);

    // Check if email is already taken by another user
    if (validatedData.email !== session.user.email) {
      const existingUser = await db.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: session.user.id },
        },
      });

      if (existingUser) {
        return { success: false, error: "Email is already taken" };
      }
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Get business profile
 */
export async function getBusinessProfile(): Promise<{
  success: boolean;
  data?: BusinessProfile;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const businessProfile = await db.businessProfile.findUnique({
      where: { userId: session.user.id },
    });

    return {
      success: true,
      data: {
        businessName: businessProfile?.businessName || null,
        industry: businessProfile?.industry || null,
        address: businessProfile?.address || null,
        taxId: businessProfile?.taxId || null,
        phone: businessProfile?.phone || null,
        website: businessProfile?.website || null,
      },
    };
  } catch (error) {
    console.error("Error getting business profile:", error);
    return { success: false, error: "Failed to get business profile" };
  }
}

/**
 * Update business profile
 */
export async function updateBusinessProfile(
  data: z.infer<typeof updateBusinessProfileSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateBusinessProfileSchema.parse(data);

    // Clean up website URL - convert empty string to undefined
    const websiteValue =
      validatedData.website === "" ? undefined : validatedData.website;

    await db.businessProfile.upsert({
      where: { userId: session.user.id },
      update: {
        businessName: validatedData.businessName,
        industry: validatedData.industry,
        address: validatedData.address,
        taxId: validatedData.taxId,
        phone: validatedData.phone,
        website: websiteValue,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        businessName: validatedData.businessName,
        industry: validatedData.industry,
        address: validatedData.address,
        taxId: validatedData.taxId,
        phone: validatedData.phone,
        website: websiteValue,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating business profile:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to update business profile" };
  }
}

/**
 * Get business statistics
 */
export async function getBusinessStats(): Promise<{
  success: boolean;
  data?: BusinessStats;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business
    const business = await db.business.findFirst({
      where: { ownerId: session.user.id },
    });

    if (!business) {
      return {
        success: true,
        data: {
          totalTransactions: 0,
          totalDocuments: 0,
          totalBankAccounts: 0,
        },
      };
    }

    const [totalTransactions, totalDocuments, totalBankAccounts] =
      await Promise.all([
        db.transaction.count({
          where: { businessId: business.id },
        }),
        db.document.count({
          where: { businessId: business.id },
        }),
        db.bankAccount.count({
          where: { businessId: business.id },
        }),
      ]);

    return {
      success: true,
      data: {
        totalTransactions,
        totalDocuments,
        totalBankAccounts,
      },
    };
  } catch (error) {
    console.error("Error getting business stats:", error);
    return { success: false, error: "Failed to get business statistics" };
  }
}
