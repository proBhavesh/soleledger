import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TransactionListProps } from "@/lib/types/transactions";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
	FiEdit2,
	FiTag,
	FiCheckCircle,
	FiFileText,
	FiTrash2,
	FiCreditCard,
	FiHome,
	FiShoppingBag,
	FiCoffee,
	FiSliders,
} from "react-icons/fi";

// Loading skeleton rows for the transaction table
function TransactionListLoading() {
	return (
		<>
			{Array(5)
				.fill(0)
				.map((_, i) => (
					<TableRow key={i}>
						<TableCell>
							<Skeleton className="h-5 w-20" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-40" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-24" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-24" />
						</TableCell>
						<TableCell className="text-right">
							<Skeleton className="h-5 w-20 ml-auto" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-5 w-5 rounded-full" />
						</TableCell>
					</TableRow>
				))}
		</>
	);
}

// No transactions found row
function NoTransactionsFound() {
	return (
		<TableRow>
			<TableCell
				colSpan={6}
				className="text-center py-12 text-muted-foreground"
			>
				No transactions found. Try changing your filters or connect a
				bank account.
			</TableCell>
		</TableRow>
	);
}

// Dropdown menu for transaction actions
function TransactionDropdownMenu() {
	return (
		<DropdownMenuContent align="end" className="w-[200px]">
			<DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-accent">
				<FiEdit2 className="h-4 w-4 text-muted-foreground" />
				<span>Edit</span>
			</DropdownMenuItem>
			<DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-accent">
				<FiTag className="h-4 w-4 text-muted-foreground" />
				<span>Categorize</span>
			</DropdownMenuItem>
			<DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-accent">
				<FiCheckCircle className="h-4 w-4 text-muted-foreground" />
				<span>Mark as reconciled</span>
			</DropdownMenuItem>
			<DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-accent">
				<FiFileText className="h-4 w-4 text-muted-foreground" />
				<span>Add receipt</span>
			</DropdownMenuItem>
			<DropdownMenuItem className="text-destructive cursor-pointer flex items-center gap-2 hover:bg-destructive/10">
				<FiTrash2 className="h-4 w-4" />
				<span>Delete</span>
			</DropdownMenuItem>
		</DropdownMenuContent>
	);
}

export function TransactionList({
	transactions,
	isLoading,
}: TransactionListProps) {
	// Get category icon based on category name
	const getCategoryIcon = (category: string) => {
		const normalizedCategory = category.toLowerCase();
		if (
			normalizedCategory.includes("shopping") ||
			normalizedCategory.includes("merchandise")
		) {
			return <FiShoppingBag className="h-4 w-4" />;
		} else if (
			normalizedCategory.includes("food") ||
			normalizedCategory.includes("restaurant")
		) {
			return <FiShoppingBag className="h-4 w-4" />;
		} else if (
			normalizedCategory.includes("home") ||
			normalizedCategory.includes("rent")
		) {
			return <FiHome className="h-4 w-4" />;
		} else if (
			normalizedCategory.includes("coffee") ||
			normalizedCategory.includes("cafe")
		) {
			return <FiCoffee className="h-4 w-4" />;
		} else {
			return <FiCreditCard className="h-4 w-4" />;
		}
	};

	return (
		<div className="rounded-lg border bg-card shadow-sm">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="font-medium text-muted-foreground">
							Date
						</TableHead>
						<TableHead className="font-medium text-muted-foreground">
							Description
						</TableHead>
						<TableHead className="font-medium text-muted-foreground">
							Category
						</TableHead>
						<TableHead className="font-medium text-muted-foreground">
							Account
						</TableHead>
						<TableHead className="text-right font-medium text-muted-foreground">
							Amount
						</TableHead>
						<TableHead className="w-[70px]" />
					</TableRow>
				</TableHeader>

				<TableBody>
					{isLoading ? (
						<TransactionListLoading />
					) : transactions.length === 0 ? (
						<NoTransactionsFound />
					) : (
						transactions.map((transaction, index) => {
							const isIncome = transaction.type === "INCOME";
							const isEven = index % 2 === 0;

							return (
								<TableRow
									key={transaction.id}
									className={`transition-colors duration-200 ${isEven ? "bg-muted/30" : ""} hover:bg-muted/50`}
								>
									{/* Date */}
									<TableCell className="py-4 align-middle whitespace-nowrap text-sm text-foreground">
										{formatDate(transaction.date)}
									</TableCell>

									{/* Description */}
									<TableCell className="py-4 align-middle whitespace-nowrap font-medium text-foreground">
										<div className="flex items-center gap-2">
											<span className="truncate">
												{transaction.merchantName ||
													transaction.description}
											</span>
										</div>
									</TableCell>

									{/* Category */}
									<TableCell className="py-4 align-middle whitespace-nowrap">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Badge
														variant="outline"
														className="flex items-center gap-1.5 px-2 py-1 text-xs md:text-sm font-medium bg-muted/40 border-muted-foreground/20"
													>
														{getCategoryIcon(
															transaction.category
														)}
														<span>
															{
																transaction.category
															}
														</span>
													</Badge>
												</TooltipTrigger>
												<TooltipContent side="top">
													{transaction.categoryConfidence
														? `${Math.round(transaction.categoryConfidence * 100)}% confidence`
														: "Category"}
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</TableCell>

									{/* Account */}
									<TableCell className="py-4 align-middle whitespace-nowrap text-muted-foreground text-sm">
										{transaction.accountName || "Unknown"}
									</TableCell>

									{/* Amount */}
									<TableCell
										className={`py-4 align-middle whitespace-nowrap text-right font-semibold ${isIncome ? "text-emerald-600" : "text-destructive"}`}
									>
										{isIncome ? "+" : "-"}
										{formatCurrency(transaction.amount)}
									</TableCell>

									{/* Actions */}
									<TableCell className="py-4 align-middle">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
													onClick={(e) =>
														e.stopPropagation()
													}
												>
													<span className="sr-only">
														Open menu
													</span>
													<FiSliders className="h-4 w-4 text-muted-foreground" />
												</Button>
											</DropdownMenuTrigger>
											<TransactionDropdownMenu />
										</DropdownMenu>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}
