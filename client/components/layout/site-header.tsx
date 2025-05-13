"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, Package2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SiteHeader() {
  const { status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = status === "authenticated";
  const isMarketingPage =
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact");

  const navItems = [
    {
      title: "Features",
      href: "/#features",
      show: isMarketingPage,
    },
    {
      title: "Pricing",
      href: "/pricing",
      show: true,
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      show: isAuthenticated,
    },
  ];

  return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md transition-all duration-200">
			<div className="flex h-16 items-center justify-between mx-auto max-w-screen-2xl">
				<Link
					href="/"
					className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
				>
					<Package2 className="h-6 w-6 text-primary" />
					<span className="text-lg">SoleLedger</span>
				</Link>

				<nav className="hidden md:flex items-center gap-8">
					{navItems
						.filter((item) => item.show)
						.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
							>
								{item.title}
							</Link>
						))}

					{isAuthenticated ? (
						<Link href="/dashboard">
							<Button
								variant="default"
								size="sm"
								className="shadow-sm hover:shadow-md transition-all duration-200"
							>
								Dashboard
							</Button>
						</Link>
					) : (
						<div className="flex items-center gap-6">
							<Link
								href="/login"
								className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
							>
								Sign In
							</Link>
							<Link href="/register">
								<Button
									variant="default"
									size="sm"
									className="shadow-sm hover:shadow-md transition-all duration-200"
								>
									Sign Up
								</Button>
							</Link>
						</div>
					)}
				</nav>

				<div className="md:hidden">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						aria-label="Toggle menu"
						className="hover:bg-muted/50 transition-colors duration-200"
					>
						{mobileMenuOpen ? (
							<X className="h-5 w-5" />
						) : (
							<Menu className="h-5 w-5" />
						)}
					</Button>
				</div>
			</div>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div className="md:hidden border-t animate-in slide-in-from-top duration-200">
					<div className="container py-4 flex flex-col space-y-2">
						{navItems
							.filter((item) => item.show)
							.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									className="text-sm font-medium p-2.5 hover:bg-muted/50 rounded-md transition-colors duration-200"
									onClick={() => setMobileMenuOpen(false)}
								>
									{item.title}
								</Link>
							))}

						{isAuthenticated ? (
							<Link
								href="/dashboard"
								onClick={() => setMobileMenuOpen(false)}
							>
								<Button
									className="w-full mt-2 shadow-sm hover:shadow-md transition-all duration-200"
									variant="default"
								>
									Dashboard
								</Button>
							</Link>
						) : (
							<div className="flex flex-col gap-2 pt-3 border-t mt-2">
								<Link
									href="/login"
									className="text-sm font-medium p-2.5 hover:bg-muted/50 rounded-md transition-colors duration-200"
									onClick={() => setMobileMenuOpen(false)}
								>
									Sign In
								</Link>
								<Link
									href="/register"
									onClick={() => setMobileMenuOpen(false)}
								>
									<Button className="w-full shadow-sm hover:shadow-md transition-all duration-200">
										Sign Up
									</Button>
								</Link>
							</div>
						)}
					</div>
				</div>
			)}
		</header>
  );
}
