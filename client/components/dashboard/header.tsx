"use client";

import Link from "next/link";
import { Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserNav from "./user-nav";
import { useSession } from "next-auth/react";

export function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <Package2 className="h-6 w-6" />
        <span>SoleLedger</span>
      </Link>
      <nav className="hidden flex-1 md:flex">
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/transactions">
            <Button variant="ghost" size="sm">
              Transactions
            </Button>
          </Link>
          <Link href="/dashboard/reports">
            <Button variant="ghost" size="sm">
              Reports
            </Button>
          </Link>
        </div>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <UserNav user={session?.user} />
      </div>
    </header>
  );
}
