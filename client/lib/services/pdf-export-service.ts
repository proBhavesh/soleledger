/**
 * PDF Export Service for Financial Reports
 * 
 * This service provides functionality to export financial reports to PDF format.
 * It generates professional-looking PDFs with proper formatting, branding, and
 * compliance tracking information.
 * 
 * Features:
 * - Export individual reports (P&L, Balance Sheet, Cash Flow, Expenses)
 * - Export all reports in a combined document
 * - Professional formatting with headers, footers, and color coding
 * - Documentation compliance percentages throughout
 * - Currency formatting for financial values
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { 
  ProfitLossData, 
  BalanceSheetData, 
  CashFlowData,
  ExpenseCategoriesData 
} from '@/lib/types/reports';

// TypeScript declarations for jsPDF-autotable are in /lib/types/jspdf-autotable.d.ts

interface PDFExportOptions {
  businessName?: string;
  period?: string;
  generatedDate?: Date;
}

// Brand colors matching the application theme
const COLORS = {
  primary: '#10b981', // emerald-500
  secondary: '#f43f5e', // rose-500
  text: '#111827', // gray-900
  muted: '#6b7280', // gray-500
  border: '#e5e7eb', // gray-200
  success: '#10b981', // green-500
  danger: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
};

/**
 * Formats a number as currency (CAD)
 * @param amount - The numeric amount to format
 * @returns Formatted currency string
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
}

/**
 * Formats a date for display in reports
 * @param date - Date object or string to format
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Adds a header section to a PDF page
 * @param doc - The jsPDF document instance
 * @param title - The report title
 * @param options - Export options including business name and period
 * @returns Y position for content start
 */
function addHeader(doc: jsPDF, title: string, options: PDFExportOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Company name
  if (options.businessName) {
    doc.setFontSize(20);
    doc.setTextColor(COLORS.text);
    doc.text(options.businessName, pageWidth / 2, 20, { align: 'center' });
  }
  
  // Report title
  doc.setFontSize(16);
  doc.setTextColor(COLORS.primary);
  doc.text(title, pageWidth / 2, 30, { align: 'center' });
  
  // Period
  if (options.period) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.muted);
    doc.text(options.period, pageWidth / 2, 37, { align: 'center' });
  }
  
  // Generated date
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.text(
    `Generated on ${formatDate(options.generatedDate || new Date())}`,
    pageWidth - 15,
    10,
    { align: 'right' }
  );
  
  return 45; // Return Y position for content start
}

/**
 * Adds a footer with page number to the current page
 * @param doc - The jsPDF document instance
 * @param pageNumber - Current page number
 */
function addFooter(doc: jsPDF, pageNumber: number): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.text(
    `Page ${pageNumber}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}

/**
 * Exports Profit & Loss report to PDF
 * 
 * @param data - The P&L data including income, expenses, and reconciliation info
 * @param options - Export options including business name and period
 * @returns jsPDF document instance
 */
export function exportProfitLossReportToPDF(
  data: ProfitLossData,
  options: PDFExportOptions = {}
) {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Profit & Loss Statement', {
    ...options,
    period: data.period
  });
  
  // Summary section
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text('Summary', 15, yPosition);
  yPosition += 10;
  
  // Summary data
  const summaryData = [
    ['Total Income', formatCurrency(data.totalIncome), `${data.incomeReconciliation.matchedPercentage.toFixed(1)}% documented`],
    ['Total Expenses', formatCurrency(data.totalExpenses), `${data.expenseReconciliation.matchedPercentage.toFixed(1)}% documented`],
    ['Net Income', formatCurrency(data.netIncome), data.netIncome >= 0 ? 'Profit' : 'Loss'],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Item', 'Amount', 'Status']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }, // emerald-500
    styles: { fontSize: 10 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' }
    }
  });
  
  yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 15;
  
  // Income by Category
  if (data.incomeByCategory.length > 0) {
    doc.setFontSize(12);
    doc.text('Income by Category', 15, yPosition);
    yPosition += 10;
    
    const incomeData = data.incomeByCategory.map(item => [
      item.category,
      formatCurrency(item.amount),
      `${item.percentage.toFixed(1)}%`,
      `${item.reconciliation.matchedPercentage.toFixed(1)}%`
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Amount', '% of Total', 'Documented']],
      body: incomeData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    
    yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 15;
  }
  
  // Check if we need a new page
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Expenses by Category
  if (data.expensesByCategory.length > 0) {
    doc.setFontSize(12);
    doc.text('Expenses by Category', 15, yPosition);
    yPosition += 10;
    
    const expenseData = data.expensesByCategory.map(item => [
      item.category,
      formatCurrency(item.amount),
      `${item.percentage.toFixed(1)}%`,
      `${item.reconciliation.matchedPercentage.toFixed(1)}%`
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Amount', '% of Total', 'Documented']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: [244, 63, 94] }, // rose-500
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
  }
  
  // Add footer
  addFooter(doc, 1);
  
  return doc;
}

/**
 * Exports Balance Sheet report to PDF
 * 
 * @param data - The balance sheet data including assets, liabilities, and equity
 * @param options - Export options including business name and period
 * @returns jsPDF document instance
 */
export function exportBalanceSheetToPDF(
  data: BalanceSheetData,
  options: PDFExportOptions = {}
) {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Balance Sheet', {
    ...options,
    period: `As of ${formatDate(data.asOfDate)}`
  });
  
  // Balance check status
  if (!data.balanceCheck.isBalanced) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.danger);
    doc.text('⚠ Warning: Balance sheet is not balanced', 15, yPosition);
    doc.text(`Difference: ${formatCurrency(Math.abs(data.balanceCheck.difference))}`, 15, yPosition + 5);
    yPosition += 15;
  }
  
  // Summary
  const summaryData = [
    ['Total Assets', formatCurrency(data.assets.totalAssets)],
    ['Total Liabilities', formatCurrency(data.liabilities.totalLiabilities)],
    ['Total Equity', formatCurrency(data.equity.totalEquity)],
    ['', ''],
    ['Assets - (Liabilities + Equity)', formatCurrency(data.balanceCheck.difference)],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Item', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // blue-500
    styles: { fontSize: 10 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });
  
  yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 15;
  
  // Assets section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text('ASSETS', 15, yPosition);
  yPosition += 10;
  
  // Current Assets
  if (data.assets.currentAssets.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(COLORS.text);
    doc.text('Current Assets', 15, yPosition);
    yPosition += 7;
    
    const currentAssetsData = data.assets.currentAssets.map(item => [
      item.name,
      formatCurrency(item.amount),
      `${item.reconciliation.matchedPercentage.toFixed(1)}%`
    ]);
    currentAssetsData.push(['Total Current Assets', formatCurrency(data.assets.totalCurrentAssets), '']);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Account', 'Amount', 'Documented']],
      body: currentAssetsData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    });
    
    yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 10;
  }
  
  // Check if we need a new page
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Liabilities section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.secondary);
  doc.text('LIABILITIES', 15, yPosition);
  yPosition += 10;
  
  // Current Liabilities
  if (data.liabilities.currentLiabilities.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(COLORS.text);
    doc.text('Current Liabilities', 15, yPosition);
    yPosition += 7;
    
    const currentLiabilitiesData = data.liabilities.currentLiabilities.map(item => [
      item.name,
      formatCurrency(item.amount),
      `${item.reconciliation.matchedPercentage.toFixed(1)}%`
    ]);
    currentLiabilitiesData.push(['Total Current Liabilities', formatCurrency(data.liabilities.totalCurrentLiabilities), '']);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Account', 'Amount', 'Documented']],
      body: currentLiabilitiesData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    });
    
    yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 10;
  }
  
  // Equity section
  doc.setFontSize(14);
  doc.setTextColor(COLORS.text);
  doc.text('EQUITY', 15, yPosition);
  yPosition += 10;
  
  const equityData = data.equity.equityItems.map(item => [
    item.name,
    formatCurrency(item.amount),
    `${item.reconciliation.matchedPercentage.toFixed(1)}%`
  ]);
  equityData.push(['Total Equity', formatCurrency(data.equity.totalEquity), '']);
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Account', 'Amount', 'Documented']],
    body: equityData,
    theme: 'plain',
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' }
    }
  });
  
  // Add footer
  addFooter(doc, 1);
  
  return doc;
}

/**
 * Exports Cash Flow Statement to PDF
 * 
 * @param data - The cash flow data including operating, investing, and financing activities
 * @param options - Export options including business name and period
 * @returns jsPDF document instance
 */
export function exportCashFlowReportToPDF(
  data: CashFlowData,
  options: PDFExportOptions = {}
) {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Cash Flow Statement', {
    ...options,
    period: data.period
  });
  
  // Summary
  const summaryData = [
    ['Beginning Cash', formatCurrency(data.beginningCash)],
    ['Net Cash Change', formatCurrency(data.netCashChange)],
    ['Ending Cash', formatCurrency(data.endingCash)],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Item', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] },
    styles: { fontSize: 10 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });
  
  yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 15;
  
  // Operating Activities
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text('Operating Activities', 15, yPosition);
  yPosition += 10;
  
  const operatingData = data.operatingActivities.items.map(item => [
    item.description,
    formatCurrency(item.amount),
    `${item.reconciliation.matchedPercentage.toFixed(1)}%`
  ]);
  operatingData.push(['Net Cash from Operating Activities', formatCurrency(data.operatingActivities.netCashFromOperating), '']);
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Amount', 'Documented']],
    body: operatingData,
    theme: 'striped',
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' }
    }
  });
  
  yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 15;
  
  // Investing Activities (if any)
  if (data.investingActivities.items.length > 0) {
    doc.setFontSize(12);
    doc.text('Investing Activities', 15, yPosition);
    yPosition += 10;
    
    const investingData = data.investingActivities.items.map(item => [
      item.description,
      formatCurrency(item.amount),
      `${item.reconciliation.matchedPercentage.toFixed(1)}%`
    ]);
    investingData.push(['Net Cash from Investing Activities', formatCurrency(data.investingActivities.netCashFromInvesting), '']);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Amount', 'Documented']],
      body: investingData,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    });
    
    yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 15;
  }
  
  // Financing Activities (if any)
  if (data.financingActivities.items.length > 0) {
    doc.setFontSize(12);
    doc.text('Financing Activities', 15, yPosition);
    yPosition += 10;
    
    const financingData = data.financingActivities.items.map(item => [
      item.description,
      formatCurrency(item.amount),
      `${item.reconciliation.matchedPercentage.toFixed(1)}%`
    ]);
    financingData.push(['Net Cash from Financing Activities', formatCurrency(data.financingActivities.netCashFromFinancing), '']);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Amount', 'Documented']],
      body: financingData,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    });
  }
  
  // Add footer
  addFooter(doc, 1);
  
  return doc;
}

/**
 * Exports Expense Categories report to PDF
 * 
 * @param data - The expense data broken down by categories with reconciliation info
 * @param options - Export options including business name and period
 * @returns jsPDF document instance
 */
export function exportExpenseCategoriesReportToPDF(
  data: ExpenseCategoriesData,
  options: PDFExportOptions = {}
) {
  const doc = new jsPDF();
  let yPosition = addHeader(doc, 'Expense Categories Report', {
    ...options,
    period: data.period
  });
  
  // Summary
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text(`Total Expenses: ${formatCurrency(data.totalExpenses)}`, 15, yPosition);
  yPosition += 7;
  doc.text(`Overall Documentation: ${data.overallReconciliation.matchedPercentage.toFixed(1)}%`, 15, yPosition);
  yPosition += 15;
  
  // Categories breakdown
  const categoriesData = data.categories.map(cat => [
    cat.category,
    formatCurrency(cat.amount),
    `${cat.percentage.toFixed(1)}%`,
    cat.transactionCount.toString(),
    `${cat.reconciliation.matchedPercentage.toFixed(1)}%`
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Category', 'Amount', '% of Total', 'Transactions', 'Documented']],
    body: categoriesData,
    theme: 'striped',
    headStyles: { fillColor: [244, 63, 94] },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' }
    }
  });
  
  yPosition = (doc.lastAutoTable?.finalY ?? yPosition) + 15;
  
  // Documentation Summary
  doc.setFontSize(12);
  doc.text('Documentation Summary', 15, yPosition);
  yPosition += 10;
  
  const docSummaryData = [
    ['Documented', formatCurrency(data.overallReconciliation.matchedAmount), `${data.overallReconciliation.matchedCount} transactions`],
    ['Missing Documentation', formatCurrency(data.overallReconciliation.unmatchedAmount), `${data.overallReconciliation.unmatchedCount} transactions`],
    ['Pending Review', formatCurrency(data.overallReconciliation.pendingReviewAmount), `${data.overallReconciliation.pendingReviewCount} transactions`],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Status', 'Amount', 'Count']],
    body: docSummaryData,
    theme: 'grid',
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' }
    }
  });
  
  // Add footer
  addFooter(doc, 1);
  
  return doc;
}

// Utility function to download the PDF
/**
 * Downloads the PDF document with the specified filename
 * @param doc - The jsPDF document to download
 * @param filename - The filename for the downloaded PDF
 */
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

// Combined export function for all reports
/**
 * Exports all available reports into a single combined PDF document
 * Includes a cover page and table of contents
 * 
 * @param reports - Object containing optional report data for each report type
 * @param options - Export options including business name and period
 * @returns jsPDF document instance containing all reports
 */
export function exportAllReportsToPDF(
  reports: {
    profitLoss?: ProfitLossData;
    balanceSheet?: BalanceSheetData;
    cashFlow?: CashFlowData;
    expenseCategories?: ExpenseCategoriesData;
  },
  options: PDFExportOptions = {}
) {
  const doc = new jsPDF();
  let pageNumber = 1;
  
  // Cover page
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(24);
  doc.setTextColor(COLORS.primary);
  doc.text('Financial Reports', pageWidth / 2, pageHeight / 3, { align: 'center' });
  
  if (options.businessName) {
    doc.setFontSize(18);
    doc.setTextColor(COLORS.text);
    doc.text(options.businessName, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });
  }
  
  if (options.period) {
    doc.setFontSize(14);
    doc.setTextColor(COLORS.muted);
    doc.text(options.period, pageWidth / 2, pageHeight / 3 + 30, { align: 'center' });
  }
  
  doc.setFontSize(10);
  doc.text(
    `Generated on ${formatDate(options.generatedDate || new Date())}`,
    pageWidth / 2,
    pageHeight / 3 + 45,
    { align: 'center' }
  );
  
  // Table of contents
  doc.setFontSize(14);
  doc.setTextColor(COLORS.text);
  doc.text('Table of Contents', 15, pageHeight / 2);
  
  let tocY = pageHeight / 2 + 15;
  const tocItems = [];
  
  if (reports.profitLoss) tocItems.push('Profit & Loss Statement');
  if (reports.balanceSheet) tocItems.push('Balance Sheet');
  if (reports.cashFlow) tocItems.push('Cash Flow Statement');
  if (reports.expenseCategories) tocItems.push('Expense Categories Report');
  
  doc.setFontSize(11);
  tocItems.forEach((item, index) => {
    doc.text(`${index + 1}. ${item}`, 20, tocY);
    tocY += 10;
  });
  
  addFooter(doc, pageNumber++);
  
  // Add individual reports
  // Note: Currently adding placeholder pages for each report
  // In a production implementation, we would need to either:
  // 1. Re-render the content directly into this document, or
  // 2. Use a server-side PDF manipulation library to merge documents
  
  if (reports.profitLoss) {
    doc.addPage();
    const yPos = addHeader(doc, 'Profit & Loss Statement', {
      ...options,
      period: reports.profitLoss.period
    });
    
    // Add summary content
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.text('Summary', 15, yPos + 10);
    doc.text(`Total Income: ${formatCurrency(reports.profitLoss.totalIncome)}`, 15, yPos + 20);
    doc.text(`Total Expenses: ${formatCurrency(reports.profitLoss.totalExpenses)}`, 15, yPos + 30);
    doc.text(`Net Income: ${formatCurrency(reports.profitLoss.netIncome)}`, 15, yPos + 40);
    doc.text(`Documentation: ${reports.profitLoss.overallReconciliation.matchedPercentage.toFixed(1)}%`, 15, yPos + 50);
    
    addFooter(doc, pageNumber++);
  }
  
  if (reports.balanceSheet) {
    doc.addPage();
    const yPos = addHeader(doc, 'Balance Sheet', {
      ...options,
      period: `As of ${formatDate(reports.balanceSheet.asOfDate)}`
    });
    
    // Add summary content
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.text('Summary', 15, yPos + 10);
    doc.text(`Total Assets: ${formatCurrency(reports.balanceSheet.assets.totalAssets)}`, 15, yPos + 20);
    doc.text(`Total Liabilities: ${formatCurrency(reports.balanceSheet.liabilities.totalLiabilities)}`, 15, yPos + 30);
    doc.text(`Total Equity: ${formatCurrency(reports.balanceSheet.equity.totalEquity)}`, 15, yPos + 40);
    doc.text(`Balance Check: ${reports.balanceSheet.balanceCheck.isBalanced ? 'Balanced' : 'Unbalanced'}`, 15, yPos + 50);
    
    addFooter(doc, pageNumber++);
  }
  
  if (reports.cashFlow) {
    doc.addPage();
    const yPos = addHeader(doc, 'Cash Flow Statement', {
      ...options,
      period: reports.cashFlow.period
    });
    
    // Add summary content
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.text('Summary', 15, yPos + 10);
    doc.text(`Beginning Cash: ${formatCurrency(reports.cashFlow.beginningCash)}`, 15, yPos + 20);
    doc.text(`Net Cash Change: ${formatCurrency(reports.cashFlow.netCashChange)}`, 15, yPos + 30);
    doc.text(`Ending Cash: ${formatCurrency(reports.cashFlow.endingCash)}`, 15, yPos + 40);
    doc.text(`Documentation: ${reports.cashFlow.overallReconciliation.matchedPercentage.toFixed(1)}%`, 15, yPos + 50);
    
    addFooter(doc, pageNumber++);
  }
  
  if (reports.expenseCategories) {
    doc.addPage();
    const yPos = addHeader(doc, 'Expense Categories Report', {
      ...options,
      period: reports.expenseCategories.period
    });
    
    // Add summary content
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.text('Summary', 15, yPos + 10);
    doc.text(`Total Expenses: ${formatCurrency(reports.expenseCategories.totalExpenses)}`, 15, yPos + 20);
    doc.text(`Documentation: ${reports.expenseCategories.overallReconciliation.matchedPercentage.toFixed(1)}%`, 15, yPos + 30);
    doc.text(`Categories: ${reports.expenseCategories.categories.length}`, 15, yPos + 40);
    
    addFooter(doc, pageNumber++);
  }
  
  return doc;
}