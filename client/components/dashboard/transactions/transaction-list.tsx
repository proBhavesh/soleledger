"use client";

import { useState } from "react";
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TransactionListProps, Transaction } from "@/lib/types/transactions";
import type { TransactionDropdownMenuProps } from "@/lib/types/transaction-operations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/utils/transaction-helpers";
import { toast } from "sonner";
import {
	deleteTransaction,
	toggleTransactionReconciliation,
} from "@/lib/actions/transaction-actions";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { CategorizeTransactionDialog } from "./categorize-transaction-dialog";
import {
	FiEdit2,
	FiTag,
	FiCheckCircle,
	FiTrash2,
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
function TransactionDropdownMenu({
	transaction,
	onEdit,
	onCategorize,
	onReconcile,
	onDelete,
}: TransactionDropdownMenuProps) {
	return (
		<DropdownMenuContent align="end" className="w-[200px]">
			<DropdownMenuItem 
				onClick={onEdit}
				className="cursor-pointer flex items-center gap-2 hover:bg-accent"
			>
				<FiEdit2 className="h-4 w-4 text-muted-foreground" />
				<span>Edit</span>
			</DropdownMenuItem>
			<DropdownMenuItem 
				onClick={onCategorize}
				className="cursor-pointer flex items-center gap-2 hover:bg-accent"
			>
				<FiTag className="h-4 w-4 text-muted-foreground" />
				<span>Categorize</span>
			</DropdownMenuItem>
			<DropdownMenuItem 
				onClick={onReconcile}
				className="cursor-pointer flex items-center gap-2 hover:bg-accent"
			>
				<FiCheckCircle className="h-4 w-4 text-muted-foreground" />
				<span>{transaction.reconciled ? "Mark as unreconciled" : "Mark as reconciled"}</span>
			</DropdownMenuItem>
			<DropdownMenuItem 
				onClick={onDelete}
				className="text-destructive cursor-pointer flex items-center gap-2 hover:bg-destructive/10"
			>
				<FiTrash2 className="h-4 w-4" />
				<span>Delete</span>
			</DropdownMenuItem>
		</DropdownMenuContent>
	);
}

export function TransactionList({
	transactions,
	isLoading,
	onRefresh,
}: TransactionListProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Handle delete transaction
	const handleDelete = async () => {
		if (!selectedTransaction) return;
		
		setIsDeleting(true);
		try {
			const result = await deleteTransaction(selectedTransaction.id);
			if (result.success && result.data) {
				toast.success(result.data.message);
				setDeleteDialogOpen(false);
				onRefresh?.();
			} else {
				toast.error(result.error || "Failed to delete transaction");
			}
		} catch {
			toast.error("Failed to delete transaction");
		} finally {
			setIsDeleting(false);
		}
	};

	// Handle reconciliation toggle
	const handleReconcile = async (transaction: Transaction) => {
		try {
			const result = await toggleTransactionReconciliation({
				transactionId: transaction.id,
				isReconciled: !transaction.reconciled,
			});
			
			if (result.success && result.data) {
				toast.success(
					transaction.reconciled 
						? "Transaction marked as unreconciled" 
						: "Transaction marked as reconciled"
				);
				onRefresh?.();
			} else {
				toast.error(result.error || "Failed to update reconciliation status");
			}
		} catch {
			toast.error("Failed to update reconciliation status");
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
														{(() => {
															const Icon = getCategoryIcon(transaction.category);
															return <Icon className="h-4 w-4" />;
														})()}
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
											<TransactionDropdownMenu 
												transaction={transaction}
												onEdit={() => {
													setSelectedTransaction(transaction);
													setEditDialogOpen(true);
												}}
												onCategorize={() => {
													setSelectedTransaction(transaction);
													setCategoryDialogOpen(true);
												}}
												onReconcile={() => handleReconcile(transaction)}
												onDelete={() => {
													setSelectedTransaction(transaction);
													setDeleteDialogOpen(true);
												}}
											/>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Transaction</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this transaction? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Transaction Dialog */}
			<EditTransactionDialog
				transaction={selectedTransaction}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSuccess={onRefresh}
			/>

			{/* Categorize Transaction Dialog */}
			<CategorizeTransactionDialog
				transaction={selectedTransaction}
				open={categoryDialogOpen}
				onOpenChange={setCategoryDialogOpen}
				onSuccess={onRefresh}
			/>

		</div>
	);
}
