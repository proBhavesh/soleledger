"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userAuthSchema, userRegistrationSchema, UserRoleEnum } from "@/lib/types";

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
            email
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
            // Create business profile
            await db.businessProfile.create({
                data: {
                    userId: user.id,
                    businessName: `${name}'s Business`, // Default business name
                },
            });

            // Create a default business for the user
            await db.business.create({
                data: {
                    name: `${name}'s Business`,
                    ownerId: user.id,
                    industry: "Other", // Default industry
                },
            });
        } else if (role === "ACCOUNTANT") {
            await db.accountantProfile.create({
                data: {
                    userId: user.id,
                    firmName: `${name}'s Accounting`, // Default firm name
                },
            });
        }

        // Return credentials for auto-login
        return {
            success: "Account created successfully",
            email,
            password,
            autoLogin: true
        };
    } catch (error) {
        console.error("Registration error:", error);
        return { error: "Failed to create account" };
    }
} 