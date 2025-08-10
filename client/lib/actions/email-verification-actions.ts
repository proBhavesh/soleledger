"use server";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { EmailVerificationEmail } from "@/lib/email/templates/email-verification";
import crypto from "crypto";
import { z } from "zod";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Send email verification link to a user
 */
export async function sendVerificationEmail(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        emailVerified: true,
        emailVerificationToken: true,
        authProvider: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Skip if already verified
    if (user.emailVerified) {
      return { success: false, error: "Email already verified" };
    }

    // OAuth users are auto-verified
    if (user.authProvider === "GOOGLE") {
      await db.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      });
      return { success: true, message: "Email verified" };
    }

    // Generate or use existing token
    let token = user.emailVerificationToken;
    if (!token) {
      token = crypto.randomUUID();
      await db.user.update({
        where: { id: userId },
        data: { emailVerificationToken: token },
      });
    }

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;
    
    const result = await sendEmail({
      to: user.email,
      subject: "Verify your SoleLedger email",
      react: EmailVerificationEmail({
        userName: user.name || "there",
        verificationUrl,
      }),
    });

    if (!result.success) {
      return { success: false, error: "Failed to send verification email" };
    }

    return { success: true, message: "Verification email sent" };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error: "Failed to send verification email" };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
  try {
    const validatedData = verifyEmailSchema.parse({ token });

    const user = await db.user.findFirst({
      where: {
        emailVerificationToken: validatedData.token,
        emailVerified: null,
      },
    });

    if (!user) {
      return { success: false, error: "Invalid or expired verification token" };
    }

    // Verify the email
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null, // Clear the token
      },
    });

    return { success: true, message: "Email verified successfully" };
  } catch (error) {
    console.error("Error verifying email:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid verification token" };
    }
    return { success: false, error: "Failed to verify email" };
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string) {
  try {
    const validatedData = resendVerificationSchema.parse({ email });

    const user = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { success: true, message: "If an account exists, a verification email has been sent" };
    }

    if (user.emailVerified) {
      return { success: false, error: "Email already verified" };
    }

    const result = await sendVerificationEmail(user.id);
    return result;
  } catch (error) {
    console.error("Error resending verification email:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid email address" };
    }
    return { success: false, error: "Failed to resend verification email" };
  }
}