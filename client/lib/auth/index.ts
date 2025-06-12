import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { Adapter } from "next-auth/adapters";
import type { DefaultSession } from "next-auth";
import { getServerSession } from "next-auth/next";

import { db } from "@/lib/db";
import { userAuthSchema } from "@/lib/types";

// Extend NextAuth types using declaration merging
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const validatedFields = userAuthSchema.safeParse({ email, password });

        if (!validatedFields.success) {
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            email,
          },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name || "",
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google") {
        try {
          // Check if user already exists
          const existingUser = await db.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // Create new user with Google OAuth
            const newUser = await db.user.create({
              data: {
                email: user.email!,
                name: user.name || "",
                image: user.image,
                role: "BUSINESS_OWNER", // Default role for Google sign-ups
                emailVerified: new Date(), // Google emails are pre-verified
              },
            });

            // Create business profile for new Google users
            await db.businessProfile.create({
              data: {
                userId: newUser.id,
                businessName: `${user.name}'s Business`,
              },
            });

            // Create a default business
            await db.business.create({
              data: {
                name: `${user.name}'s Business`,
                ownerId: newUser.id,
                industry: "Other",
              },
            });
          }

          return true;
        } catch (error) {
          console.error("Error during Google sign-in:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "BUSINESS_OWNER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Use this helper function for getting the session on the server
export const auth = () => getServerSession(authOptions);
