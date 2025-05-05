import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import AuthSessionProvider from "@/components/providers/session-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s | SoleLedger",
    default: "SoleLedger - Automate Your Bookkeeping",
  },
  description:
    "SoleLedger is an automated bookkeeping SaaS platform designed to simplify, streamline, and automate financial management.",
  keywords: [
    "bookkeeping",
    "accounting",
    "finance",
    "business",
    "automation",
    "receipts",
    "invoices",
    "transactions",
    "reports",
  ],
  authors: [
    {
      name: "SoleLedger Team",
    },
  ],
  creator: "SoleLedger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthSessionProvider>{children}</AuthSessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
