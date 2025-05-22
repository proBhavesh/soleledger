// Database query types used in Prisma operations

// Prisma where clause type for Transaction queries
export interface TransactionWhereInput {
  businessId?: string;
  category?: {
    name?: string;
  };
  OR?: Array<{
    description?: {
      contains?: string;
      mode?: "insensitive" | "default";
    };
    notes?: {
      contains?: string;
      mode?: "insensitive" | "default";
    };
  }>;
  date?: {
    gte?: Date;
    lte?: Date;
  };
}

// Generic Prisma where input type
export interface PrismaWhereInput {
  [key: string]: unknown;
}
