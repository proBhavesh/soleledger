/**
 * Type declarations for jsPDF-autotable integration
 * These types help with proper TypeScript support for PDF generation
 */

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface AutoTableResult {
  finalY: number;
  pageNumber: number;
}