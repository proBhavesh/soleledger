import { PrismaClient } from "@/lib/generated/prisma";

// Define a proper type for the global object with prisma
interface CustomNodeJsGlobal {
  prisma: PrismaClient | undefined;
}

// Ensure the 'global' object has the correct type
const globalForPrisma = global as unknown as CustomNodeJsGlobal;

// Create a single instance of Prisma Client that can be reused
export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Prevent multiple instances in development due to hot reloading
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
