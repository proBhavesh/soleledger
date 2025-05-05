import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  ChevronDownIcon,
  DownloadIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TrashIcon,
} from "lucide-react";

export default async function TransactionsPage() {
  const session = await auth();
  const userRole = session?.user?.role || "BUSINESS_OWNER";

  // Mock transaction data
  const transactions = [
    {
      id: "tr_1",
      date: "2023-10-15",
      description: "Client Payment",
      category: "Income",
      amount: 1499.99,
      type: "credit",
      status: "reconciled",
    },
    {
      id: "tr_2",
      date: "2023-10-12",
      description: "Office Supplies",
      category: "Office Expenses",
      amount: 249.99,
      type: "debit",
      status: "pending",
    },
    {
      id: "tr_3",
      date: "2023-10-10",
      description: "Software Subscription",
      category: "Software",
      amount: 49.99,
      type: "debit",
      status: "reconciled",
    },
    {
      id: "tr_4",
      date: "2023-10-08",
      description: "Client Dinner",
      category: "Meals & Entertainment",
      amount: 125.5,
      type: "debit",
      status: "pending",
    },
    {
      id: "tr_5",
      date: "2023-10-05",
      description: "Rent Payment",
      category: "Rent",
      amount: 1200.0,
      type: "debit",
      status: "reconciled",
    },
    {
      id: "tr_6",
      date: "2023-10-03",
      description: "Phone Bill",
      category: "Utilities",
      amount: 89.99,
      type: "debit",
      status: "pending",
    },
    {
      id: "tr_7",
      date: "2023-10-01",
      description: "Client Retainer",
      category: "Income",
      amount: 3000.0,
      type: "credit",
      status: "reconciled",
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatCurrency = (amount: number, type: string) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    });

    return type === "debit"
      ? `-${formatter.format(amount)}`
      : `+${formatter.format(amount)}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View and manage your financial transactions
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button size="sm">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </div>
            </div>
            <CardDescription>
              All your financial activities in one place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
              <Input
                type="search"
                placeholder="Search transactions..."
                className="h-9"
              />
              <Button type="submit" size="sm" variant="ghost">
                <SearchIcon className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" variant="ghost">
                <Calendar className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead className="max-w-[300px]">Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell className="font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell
                        className={`text-right ${
                          transaction.type === "credit"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(transaction.amount, transaction.type)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${
                            transaction.status === "reconciled"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {transaction.status === "reconciled"
                            ? "Reconciled"
                            : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Open menu</span>
                              <SlidersHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Categorize</DropdownMenuItem>
                            <DropdownMenuItem>
                              {transaction.status === "pending"
                                ? "Mark as reconciled"
                                : "Mark as pending"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>Add receipt</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <TrashIcon className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing <strong>7</strong> of <strong>42</strong> transactions
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Summary</CardTitle>
              <CardDescription>October 2023</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="h-4 w-4 rounded-full bg-emerald-500 mr-2" />
                    <span>Income</span>
                  </div>
                  <span className="font-medium text-emerald-600">
                    $4,499.99
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="h-4 w-4 rounded-full bg-red-500 mr-2" />
                    <span>Expenses</span>
                  </div>
                  <span className="font-medium text-red-600">$1,715.47</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Net</span>
                    <span className="text-emerald-600">$2,784.52</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common transaction tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
                <Button variant="outline" className="justify-start">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
                {userRole === "ACCOUNTANT" && (
                  <Button variant="outline" className="justify-start">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    Reconcile Accounts
                  </Button>
                )}
                <Button variant="outline" className="justify-start">
                  <ChevronDownIcon className="mr-2 h-4 w-4" />
                  Categorize All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
