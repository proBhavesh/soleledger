"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  userAuthSchema,
  userRegistrationSchema,
  UserRoleEnum,
} from "@/lib/types";
import { createDefaultChartOfAccounts } from "./chart-of-accounts-actions";
import { sendEmail } from "@/lib/email/resend";
import { PasswordResetEmail } from "@/lib/email/templates/password-reset";
import { z } from "zod";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Invalid credentials" };
  }

  // Validate input
  const validatedFields = userAuthSchema.safeParse({ email, password });

  if (!validatedFields.success) {
    return { error: "Invalid credentials" };
  }

  try {
    // Using server-side validation only
    // Client will handle the actual authentication via signIn
    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Authentication failed" };
  }
}

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const roleValue = formData.get("role") as string;
  const acceptTerms = Boolean(formData.get("acceptTerms"));

  // Parse the role to ensure it's valid
  const role = UserRoleEnum.parse(roleValue);

  // Validate input
  const validatedFields = userRegistrationSchema.safeParse({
    name,
    email,
    password,
    role,
    acceptTerms,
  });

  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return { error: "Email already in use" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role,
      },
    });

    // Create corresponding profile based on role
    if (role === "BUSINESS_OWNER") {
      try {
        // Create business profile
        await db.businessProfile.create({
          data: {
            userId: user.id,
            businessName: `${name}'s Business`, // Default business name
          },
        });

        // Create business and member in a transaction to prevent partial data
        const business = await db.$transaction(async (tx) => {
          // Create a default business for the user
          const newBusiness = await tx.business.create({
            data: {
              name: `${name}'s Business`,
              ownerId: user.id,
              industry: "Other", // Default industry
            },
          });

          // Create BusinessMember record for the owner
          await tx.businessMember.create({
            data: {
              businessId: newBusiness.id,
              userId: user.id,
              role: "BUSINESS_OWNER",
              accessLevel: "FULL_MANAGEMENT",
              joinedAt: new Date(),
            },
          });

          return newBusiness;
        });

        // Create default Chart of Accounts for the business (async, non-blocking)
        createDefaultChartOfAccounts(business.id, user.id).catch(chartError => {
          console.error("Chart of accounts creation failed (background):", chartError);
        });
      } catch (profileError) {
        console.error("Business profile creation error:", profileError);
        // Clean up user if profile creation fails
        await db.user.delete({ where: { id: user.id } });
        return { error: "Failed to create business profile" };
      }
    } else if (role === "ACCOUNTANT") {
      try {
        await db.accountantProfile.create({
          data: {
            userId: user.id,
            firmName: `${name}'s Accounting`, // Default firm name
          },
        });
      } catch (profileError) {
        console.error("Accountant profile creation error:", profileError);
        // Clean up user if profile creation fails
        await db.user.delete({ where: { id: user.id } });
        return { error: "Failed to create accountant profile" };
      }
    }

    // Return credentials for auto-login
    return {
      success: "Account created successfully",
      email,
      autoLogin: true,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to create account" };
  }
}

// Password reset schemas
const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

/**
 * Request a password reset link
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate email
    const validated = requestPasswordResetSchema.parse({ email });
    
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: validated.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true };
    }

    // Check for recent password reset requests (rate limiting)
    const recentRequest = await db.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    if (recentRequest) {
      return { success: false, error: "Please wait 5 minutes before requesting another reset link" };
    }

    // Create password reset token
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const resetToken = await db.passwordResetToken.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken.token}`;
    
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset your SoleLedger password",
      react: PasswordResetEmail({
        userName: user.name || user.email,
        resetUrl,
        expiresAt: expiresAt.toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      }),
    });

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      return { success: false, error: "Failed to send reset email. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid email address" };
    }
    return { success: false, error: "Failed to process request" };
  }
}

/**
 * Validate a password reset token
 */
export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return { valid: false, error: "Invalid token" };
    }

    if (resetToken.usedAt) {
      return { valid: false, error: "Token already used" };
    }

    if (new Date() > resetToken.expiresAt) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true };
  } catch (error) {
    console.error("Token validation error:", error);
    return { valid: false, error: "Failed to validate token" };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(data: { token: string; password: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = resetPasswordSchema.parse(data);

    // Find and validate token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token: validated.token },
      include: { user: true },
    });

    if (!resetToken) {
      return { success: false, error: "Invalid reset link" };
    }

    if (resetToken.usedAt) {
      return { success: false, error: "This reset link has already been used" };
    }

    if (new Date() > resetToken.expiresAt) {
      return { success: false, error: "This reset link has expired" };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Update user password and mark token as used
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { 
          hashedPassword,
          // Update emailVerified if it wasn't already verified
          emailVerified: resetToken.user.emailVerified || new Date(),
        },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid password format" };
    }
    return { success: false, error: "Failed to reset password" };
  }
}
