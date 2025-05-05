import { PrismaClient } from "@/lib/generated/prisma";

declare global {
    // Allow global `prisma` access
    var prisma: PrismaClient | undefined;
}

export const db =
    global.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") global.prisma = db; 