"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CreditCard,
  Home,
  Receipt,
  Settings,
  Users,
  Landmark,
  Link2,
  FileBarChart,
  Package2,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuGroups = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: Home,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
    ],
  },
  {
    title: "Financial",
    items: [
      {
        title: "Transactions",
        href: "/dashboard/transactions",
        icon: CreditCard,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
      {
        title: "Bank Accounts",
        href: "/dashboard/bank-accounts",
        icon: Landmark,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
    ],
  },
  {
    title: "Documents",
    items: [
      {
        title: "Receipts",
        href: "/dashboard/receipts",
        icon: Receipt,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
      {
        title: "Reconciliation",
        href: "/dashboard/reconciliation",
        icon: Link2,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
    ],
  },
  {
    title: "Reports & Analysis",
    items: [
      {
        title: "Reports",
        href: "/dashboard/reports",
        icon: FileBarChart,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Clients",
        href: "/dashboard/clients",
        icon: Users,
        roles: ["ACCOUNTANT", "ADMIN"],
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
    ],
  },
];

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
};

type DashboardNavProps = {
  user: User;
};

// Function to get user's initials for avatar fallback
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const userRole = user?.role || "BUSINESS_OWNER";

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Package2 className="h-6 w-6" />
          <span>SoleLedger</span>
        </Link>
      </div>

      {/* Navigation Menu */}
      <Card className="flex-1 border-0 shadow-none rounded-none">
        <CardContent className="p-4">
          <nav className="space-y-6">
            {menuGroups.map((group) => {
              // Check if any items in this group should be shown to the current user
              const filteredItems = group.items.filter((item) =>
                item.roles.includes(userRole as string)
              );

              // Only show group if it has visible items
              if (filteredItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase px-2">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {filteredItems.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={
                            pathname === item.href ? "secondary" : "ghost"
                          }
                          size="sm"
                          className={cn(
                            "w-full justify-start cursor-pointer",
                            pathname === item.href &&
                              "bg-muted font-medium text-primary"
                          )}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    ))}
                  </div>
                  <Separator className="mt-2" />
                </div>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* User Profile Section */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-2 h-auto hover:bg-muted"
            >
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="text-xs">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium truncate max-w-[150px]">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {user?.email}
                  </span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="w-full cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/settings"
                className="w-full cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
