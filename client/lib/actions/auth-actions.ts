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
import {
  type PasswordResetResponse,
  type PasswordResetValidationResponse,
  AUTH_ERROR_MESSAGES,
} from "@/lib/types/auth-actions";
import { AuthProvider } from "@/generated/prisma";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: AUTH_ERROR_MESSAGES.invalidCredentials };
  }

  // Validate input
  const validatedFields = userAuthSchema.safeParse({ email, password });

  if (!validatedFields.success) {
    return { error: AUTH_ERROR_MESSAGES.invalidCredentials };
  }

  try {
    // Using server-side validation only
    // Client will handle the actual authentication via signIn
    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: AUTH_ERROR_MESSAGES.invalidCredentials };
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
    return { error: AUTH_ERROR_MESSAGES.serverError };
  }

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return { error: AUTH_ERROR_MESSAGES.emailExists };
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
        authProvider: AuthProvider.CREDENTIALS,
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

        // Create default Chart of Accounts for the business (synchronous, required)
        const chartResult = await createDefaultChartOfAccounts(business.id, user.id);
        if (!chartResult.success) {
          console.error("Chart of accounts creation failed:", chartResult.error);
          // Don't fail the registration, but log the error
          // User can still set up Chart of Accounts later
        }
      } catch (profileError) {
        console.error("Business profile creation error:", profileError);
        // Clean up user if profile creation fails
        await db.user.delete({ where: { id: user.id } });
        return { error: AUTH_ERROR_MESSAGES.businessCreationFailed };
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
        return { error: AUTH_ERROR_MESSAGES.serverError };
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
    return { error: AUTH_ERROR_MESSAGES.serverError };
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
export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
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

    // Check if user has OAuth authentication
    if (!user.hashedPassword && user.authProvider === AuthProvider.GOOGLE) {
      return { success: false, error: "This account uses Google sign-in. Please sign in with Google instead." };
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
      return { success: false, error: AUTH_ERROR_MESSAGES.serverError };
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
      return { success: false, error: AUTH_ERROR_MESSAGES.serverError };
    }

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: AUTH_ERROR_MESSAGES.userNotFound };
    }
    return { success: false, error: AUTH_ERROR_MESSAGES.serverError };
  }
}

/**
 * Validate a password reset token
 */
export async function validatePasswordResetToken(token: string): Promise<PasswordResetValidationResponse> {
  try {
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return { valid: false, error: AUTH_ERROR_MESSAGES.invalidToken };
    }

    if (resetToken.usedAt) {
      return { valid: false, error: AUTH_ERROR_MESSAGES.invalidToken };
    }

    if (new Date() > resetToken.expiresAt) {
      return { valid: false, error: AUTH_ERROR_MESSAGES.tokenExpired };
    }

    return { valid: true };
  } catch (error) {
    console.error("Token validation error:", error);
    return { valid: false, error: AUTH_ERROR_MESSAGES.serverError };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(data: { token: string; password: string }): Promise<PasswordResetResponse> {
  try {
    const validated = resetPasswordSchema.parse(data);

    // Find and validate token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token: validated.token },
      include: { user: true },
    });

    if (!resetToken) {
      return { success: false, error: AUTH_ERROR_MESSAGES.invalidToken };
    }

    if (resetToken.usedAt) {
      return { success: false, error: AUTH_ERROR_MESSAGES.invalidToken };
    }

    if (new Date() > resetToken.expiresAt) {
      return { success: false, error: AUTH_ERROR_MESSAGES.tokenExpired };
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
      return { success: false, error: AUTH_ERROR_MESSAGES.weakPassword };
    }
    return { success: false, error: AUTH_ERROR_MESSAGES.serverError };
  }
}
