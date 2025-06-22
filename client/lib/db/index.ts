import { PrismaClient, Prisma } from "@/generated/prisma";

// Simple function to create a new PrismaClient instance
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Disable all logging
    log: [],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const db = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Export Prisma namespace for types
export { Prisma };

export default db;
