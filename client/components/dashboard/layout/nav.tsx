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
        color: "text-blue-600",
        bgColor: "bg-blue-100",
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
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        title: "Bank Accounts",
        href: "/dashboard/bank-accounts",
        icon: Landmark,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
        color: "text-purple-600",
        bgColor: "bg-purple-100",
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
        color: "text-amber-600",
        bgColor: "bg-amber-100",
      },
      {
        title: "Reconciliation",
        href: "/dashboard/reconciliation",
        icon: Link2,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
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
        color: "text-rose-600",
        bgColor: "bg-rose-100",
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
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
        color: "text-gray-600",
        bgColor: "bg-gray-100",
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
    <div className="flex h-full flex-col bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b px-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold group"
        >
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md group-hover:shadow-lg transition-all">
            <Package2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">SoleLedger</span>
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
                    {filteredItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer group",
                              isActive
                                ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 shadow-sm"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800/50"
                            )}
                          >
                            <div
                              className={cn(
                                "p-2 rounded-lg transition-all duration-200",
                                isActive
                                  ? item.bgColor + " shadow-sm"
                                  : "bg-gray-100 dark:bg-gray-800 group-hover:" + item.bgColor
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "h-4 w-4 transition-colors",
                                  isActive
                                    ? item.color
                                    : "text-gray-600 dark:text-gray-400 group-hover:" + item.color
                                )}
                              />
                            </div>
                            <span
                              className={cn(
                                "text-sm font-medium transition-colors",
                                isActive
                                  ? "text-gray-900 dark:text-gray-100"
                                  : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                              )}
                            >
                              {item.title}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <Separator className="mt-2" />
                </div>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* User Profile Section */}
      <div className="border-t p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-3 h-auto hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-10 w-10 ring-2 ring-indigo-100 dark:ring-indigo-900">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="text-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-semibold truncate max-w-[150px] text-gray-900 dark:text-gray-100">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
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
