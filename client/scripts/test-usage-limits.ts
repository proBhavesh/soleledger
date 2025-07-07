#!/usr/bin/env tsx
/**
 * Test script for usage limits
 * Run with: pnpm tsx scripts/test-usage-limits.ts
 */

import { PrismaClient } from "@prisma/client";
import { startOfMonth } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const command = process.argv[2];
  const businessId = process.argv[3];

  if (!command || !businessId) {
    console.log(`
Usage: pnpm tsx scripts/test-usage-limits.ts <command> <businessId>

Commands:
  check    - Check current usage
  reset    - Reset usage to 0
  set-high - Set usage to 90% of free plan limits
  set-max  - Set usage to free plan limits
    `);
    process.exit(1);
  }

  const currentMonth = startOfMonth(new Date());

  try {
    switch (command) {
      case "check": {
        const usage = await prisma.usage.findUnique({
          where: {
            businessId_month: {
              businessId,
              month: currentMonth,
            },
          },
        });

        if (!usage) {
          console.log("No usage record found for this month");
        } else {
          console.log("Current Usage:");
          console.log(`- Transactions: ${usage.transactionCount}/100 (Free limit)`);
          console.log(`- Documents: ${usage.documentUploadCount}/10 (Free limit)`);
        }
        break;
      }

      case "reset": {
        await prisma.usage.upsert({
          where: {
            businessId_month: {
              businessId,
              month: currentMonth,
            },
          },
          create: {
            businessId,
            month: currentMonth,
            transactionCount: 0,
            documentUploadCount: 0,
          },
          update: {
            transactionCount: 0,
            documentUploadCount: 0,
          },
        });
        console.log("Usage reset to 0");
        break;
      }

      case "set-high": {
        await prisma.usage.upsert({
          where: {
            businessId_month: {
              businessId,
              month: currentMonth,
            },
          },
          create: {
            businessId,
            month: currentMonth,
            transactionCount: 90,
            documentUploadCount: 9,
          },
          update: {
            transactionCount: 90,
            documentUploadCount: 9,
          },
        });
        console.log("Usage set to 90% of free limits (90 transactions, 9 documents)");
        break;
      }

      case "set-max": {
        await prisma.usage.upsert({
          where: {
            businessId_month: {
              businessId,
              month: currentMonth,
            },
          },
          create: {
            businessId,
            month: currentMonth,
            transactionCount: 100,
            documentUploadCount: 10,
          },
          update: {
            transactionCount: 100,
            documentUploadCount: 10,
          },
        });
        console.log("Usage set to free plan limits (100 transactions, 10 documents)");
        break;
      }

      default:
        console.log("Unknown command:", command);
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();