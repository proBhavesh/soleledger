"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Gets all bank accounts for the current user's business
 */
export async function getBankAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // Get active business for the user
  const business = await db.business.findFirst({
    where: {
      ownerId: userId,
    },
  });

  if (!business) {
    return [];
  }

  const accounts = await db.bankAccount.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return { accounts, businessId: business.id };
}
