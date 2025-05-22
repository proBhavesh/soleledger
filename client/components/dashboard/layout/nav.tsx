"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  Receipt,
  Settings,
  Upload,
  Users,
  Landmark,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
        submenu: [
          {
            title: "All Transactions",
            href: "/dashboard/transactions",
          },
          {
            title: "Income",
            href: "/dashboard/transactions/income",
          },
          {
            title: "Expenses",
            href: "/dashboard/transactions/expenses",
          },
        ],
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
        title: "All Documents",
        href: "/dashboard/documents",
        icon: FileText,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
      {
        title: "Upload",
        href: "/dashboard/upload",
        icon: Upload,
        roles: ["BUSINESS_OWNER", "ACCOUNTANT", "ADMIN"],
      },
      {
        title: "Receipts",
        href: "/dashboard/receipts",
        icon: Receipt,
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
        icon: BarChart3,
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

export function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "BUSINESS_OWNER";

  return (
		<Card className="h-full border-0 shadow-none rounded-none">
			<CardContent className="p-4 pt-0">
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
									{filteredItems.map((item) =>
										item.submenu ? (
											<Accordion
												key={item.href}
												type="single"
												collapsible
												className="border-none cursor-pointer"
											>
												<AccordionItem
													value={item.title}
													className="border-0"
												>
													<AccordionTrigger
														className={cn(
															"flex items-center py-2 px-3 text-sm rounded-md hover:bg-muted justify-start no-underline hover:no-underline cursor-pointer",
															pathname ===
																item.href &&
																"bg-muted font-medium text-primary"
														)}
													>
														<item.icon className="mr-2 h-4 w-4" />
														<span>
															{item.title}
														</span>
													</AccordionTrigger>
													<AccordionContent className="pt-1 pb-0 px-1">
														{item.submenu.map(
															(subitem) => (
																<Link
																	key={
																		subitem.href
																	}
																	href={
																		subitem.href
																	}
																>
																	<Button
																		variant="ghost"
																		size="sm"
																		className={cn(
																			"w-full justify-start pl-9 mb-1 cursor-pointer",
																			pathname ===
																				subitem.href &&
																				"bg-muted font-medium text-primary"
																		)}
																	>
																		<Circle className="mr-2 h-2 w-2" />
																		{
																			subitem.title
																		}
																	</Button>
																</Link>
															)
														)}
													</AccordionContent>
												</AccordionItem>
											</Accordion>
										) : (
											<Link
												key={item.href}
												href={item.href}
											>
												<Button
													variant={
														pathname === item.href
															? "secondary"
															: "ghost"
													}
													size="sm"
													className={cn(
														"w-full justify-start cursor-pointer",
														pathname ===
															item.href &&
															"bg-muted font-medium text-primary"
													)}
												>
													<item.icon className="mr-2 h-4 w-4" />
													{item.title}
												</Button>
											</Link>
										)
									)}
								</div>
								<Separator className="mt-2" />
							</div>
						);
					})}
				</nav>
			</CardContent>
		</Card>
  );
}
