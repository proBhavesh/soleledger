"use server";

import { auth } from "@/lib/auth";
import { db, Prisma, ReportType } from "@/lib/db";
import { z } from "zod";
import { buildUserBusinessWhere } from "@/lib/utils/permission-helpers";
import type { 
  SaveReportInput, 
  ReportHistoryFilters, 
  SavedReport,
  ProfitLossData,
  BalanceSheetData,
  CashFlowData,
  ExpenseCategoriesData,
  ReconciliationSummaryReport
} from "@/lib/types/reports";

// Validation schemas
const saveReportSchema = z.object({
  type: z.enum([
    "PROFIT_LOSS",
    "BALANCE_SHEET",
    "CASH_FLOW",
    "EXPENSE_CATEGORIES",
    "RECONCILIATION_SUMMARY",
    "TAX_SUMMARY",
    "MONTHLY_SUMMARY",
  ]),
  title: z.string(),
  data: z.any(), // JSON data
  parameters: z.object({
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    period: z.string().optional(),
  }),
  period: z.string(),
  startDate: z.date(),
  endDate: z.date(),
});

const getReportHistorySchema = z.object({
  type: z.enum([
    "PROFIT_LOSS",
    "BALANCE_SHEET",
    "CASH_FLOW",
    "EXPENSE_CATEGORIES",
    "RECONCILIATION_SUMMARY",
    "TAX_SUMMARY",
    "MONTHLY_SUMMARY",
  ]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().default(10),
  offset: z.number().default(0),
});

/**
 * Save a generated report to the database
 */
export async function saveGeneratedReport(
  input: SaveReportInput
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = saveReportSchema.parse(input);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Save the report
    const report = await db.reportData.create({
      data: {
        businessId: business.id,
        type: validatedData.type,
        title: validatedData.title,
        data: validatedData.data as Prisma.JsonObject,
        parameters: validatedData.parameters as Prisma.JsonObject,
        period: validatedData.period,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        generatedBy: session.user.id,
        isScheduled: false,
      },
    });

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error("Error saving report:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid report data" };
    }
    return { success: false, error: "Failed to save report" };
  }
}

/**
 * Get report history for the user's business
 */
export async function getReportHistory(
  filters: ReportHistoryFilters = {}
): Promise<{ success: boolean; reports?: SavedReport[]; total?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedFilters = getReportHistorySchema.parse(filters);

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Build where clause
    const where: Prisma.ReportDataWhereInput = {
      businessId: business.id,
    };

    if (validatedFilters.type) {
      where.type = validatedFilters.type;
    }

    if (validatedFilters.startDate || validatedFilters.endDate) {
      where.generatedAt = {};
      if (validatedFilters.startDate) {
        where.generatedAt.gte = validatedFilters.startDate;
      }
      if (validatedFilters.endDate) {
        where.generatedAt.lte = validatedFilters.endDate;
      }
    }

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      db.reportData.findMany({
        where,
        include: {
          generator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          generatedAt: "desc",
        },
        take: validatedFilters.limit,
        skip: validatedFilters.offset,
      }),
      db.reportData.count({ where }),
    ]);

    // Transform the data
    const formattedReports: SavedReport[] = reports.map((report) => ({
      id: report.id,
      type: report.type,
      title: report.title,
      data: report.data as ProfitLossData | BalanceSheetData | CashFlowData | ExpenseCategoriesData | ReconciliationSummaryReport | Record<string, unknown>,
      parameters: report.parameters as {
        type: string;
        startDate: string;
        endDate: string;
        period?: string;
      },
      period: report.period,
      startDate: report.startDate,
      endDate: report.endDate,
      generatedAt: report.generatedAt,
      generatedBy: report.generator.name || report.generator.email || "Unknown",
    }));

    return { success: true, reports: formattedReports, total };
  } catch (error) {
    console.error("Error getting report history:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid filter parameters" };
    }
    return { success: false, error: "Failed to get report history" };
  }
}

/**
 * Get a saved report by ID
 */
export async function getSavedReport(
  reportId: string
): Promise<{ success: boolean; report?: SavedReport; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the report and verify ownership
    const report = await db.reportData.findFirst({
      where: {
        id: reportId,
        business: {
          ownerId: session.user.id,
        },
      },
      include: {
        generator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    // Transform the data
    const formattedReport: SavedReport = {
      id: report.id,
      type: report.type,
      title: report.title,
      data: report.data as ProfitLossData | BalanceSheetData | CashFlowData | ExpenseCategoriesData | ReconciliationSummaryReport | Record<string, unknown>,
      parameters: report.parameters as {
        type: string;
        startDate: string;
        endDate: string;
        period?: string;
      },
      period: report.period,
      startDate: report.startDate,
      endDate: report.endDate,
      generatedAt: report.generatedAt,
      generatedBy: report.generator.name || report.generator.email || "Unknown",
    };

    return { success: true, report: formattedReport };
  } catch (error) {
    console.error("Error getting saved report:", error);
    return { success: false, error: "Failed to get report" };
  }
}

/**
 * Delete a saved report
 */
export async function deleteSavedReport(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Delete the report (will verify ownership through the where clause)
    const deleted = await db.reportData.deleteMany({
      where: {
        id: reportId,
        business: {
          ownerId: session.user.id,
        },
      },
    });

    if (deleted.count === 0) {
      return { success: false, error: "Report not found or unauthorized" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting report:", error);
    return { success: false, error: "Failed to delete report" };
  }
}

/**
 * Get the latest report for each type
 */
export async function getLatestReports(): Promise<{
  success: boolean;
  reports?: {
    profitLoss?: SavedReport;
    balanceSheet?: SavedReport;
    cashFlow?: SavedReport;
    expenseCategories?: SavedReport;
    reconciliationSummary?: SavedReport;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get the latest report for each type
    const reportTypes: ReportType[] = [
      "PROFIT_LOSS",
      "BALANCE_SHEET",
      "CASH_FLOW",
      "EXPENSE_CATEGORIES",
      "RECONCILIATION_SUMMARY",
    ];

    const latestReports = await Promise.all(
      reportTypes.map(async (type) => {
        const report = await db.reportData.findFirst({
          where: {
            businessId: business.id,
            type,
          },
          include: {
            generator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            generatedAt: "desc",
          },
        });

        if (!report) return null;

        return {
          type,
          report: {
            id: report.id,
            type: report.type,
            title: report.title,
            data: report.data as ProfitLossData | BalanceSheetData | CashFlowData | ExpenseCategoriesData | ReconciliationSummaryReport | Record<string, unknown>,
            parameters: report.parameters as {
              type: string;
              startDate: string;
              endDate: string;
              period?: string;
            },
            period: report.period,
            startDate: report.startDate,
            endDate: report.endDate,
            generatedAt: report.generatedAt,
            generatedBy: report.generator.name || report.generator.email || "Unknown",
          },
        };
      })
    );

    const reports: {
      profitLoss?: SavedReport;
      balanceSheet?: SavedReport;
      cashFlow?: SavedReport;
      expenseCategories?: SavedReport;
      reconciliationSummary?: SavedReport;
    } = {};

    latestReports.forEach((item) => {
      if (item) {
        switch (item.type) {
          case "PROFIT_LOSS":
            reports.profitLoss = item.report;
            break;
          case "BALANCE_SHEET":
            reports.balanceSheet = item.report;
            break;
          case "CASH_FLOW":
            reports.cashFlow = item.report;
            break;
          case "EXPENSE_CATEGORIES":
            reports.expenseCategories = item.report;
            break;
          case "RECONCILIATION_SUMMARY":
            reports.reconciliationSummary = item.report;
            break;
        }
      }
    });

    return { success: true, reports };
  } catch (error) {
    console.error("Error getting latest reports:", error);
    return { success: false, error: "Failed to get latest reports" };
  }
}

/**
 * Get report statistics for the dashboard
 */
export async function getReportStatistics(): Promise<{
  success: boolean;
  stats?: {
    totalReports: number;
    reportsByType: Record<ReportType, number>;
    recentReports: number;
    scheduledReports: number;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's business (works for both owners and accountants)
    const business = await db.business.findFirst({
      where: buildUserBusinessWhere(session.user.id),
    });

    if (!business) {
      return { success: false, error: "No business found" };
    }

    // Get statistics
    const [totalReports, reportsByType, recentReports, scheduledReports] = await Promise.all([
      db.reportData.count({
        where: { businessId: business.id },
      }),
      db.reportData.groupBy({
        by: ["type"],
        where: { businessId: business.id },
        _count: true,
      }),
      db.reportData.count({
        where: {
          businessId: business.id,
          generatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      db.reportData.count({
        where: {
          businessId: business.id,
          isScheduled: true,
        },
      }),
    ]);

    // Transform reportsByType to a record
    const reportsByTypeRecord: Record<ReportType, number> = {
      PROFIT_LOSS: 0,
      BALANCE_SHEET: 0,
      CASH_FLOW: 0,
      EXPENSE_CATEGORIES: 0,
      RECONCILIATION_SUMMARY: 0,
      TAX_SUMMARY: 0,
      MONTHLY_SUMMARY: 0,
    };

    reportsByType.forEach((item) => {
      reportsByTypeRecord[item.type] = item._count;
    });

    return {
      success: true,
      stats: {
        totalReports,
        reportsByType: reportsByTypeRecord,
        recentReports,
        scheduledReports,
      },
    };
  } catch (error) {
    console.error("Error getting report statistics:", error);
    return { success: false, error: "Failed to get statistics" };
  }
}