"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Building,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  getChartOfAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
} from "@/lib/actions/chart-of-accounts-actions";
import { type ChartAccount } from "@/lib/types";

export function ChartOfAccountsSettings() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(
    null
  );
  const [formData, setFormData] = useState({
    accountCode: "",
    name: "",
    accountType: "",
    description: "",
    parentId: "",
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const result = await getChartOfAccounts();
      if (result.success && result.accounts) {
        setAccounts(result.accounts);
      } else {
        toast.error(result.error || "Failed to load chart of accounts");
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast.error("Failed to load chart of accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!formData.accountCode || !formData.name || !formData.accountType) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const result = await createAccount({
        accountCode: formData.accountCode,
        name: formData.name,
        accountType: formData.accountType as
          | "ASSET"
          | "LIABILITY"
          | "EQUITY"
          | "INCOME"
          | "EXPENSE",
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      });

      if (result.success) {
        toast.success("Account created successfully");
        setIsCreateDialogOpen(false);
        resetForm();
        await loadAccounts();
      } else {
        toast.error(result.error || "Failed to create account");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Failed to create account");
    }
  };

  const handleEditAccount = async () => {
    if (
      !editingAccount ||
      !formData.accountCode ||
      !formData.name ||
      !formData.accountType
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const result = await updateAccount(editingAccount.id, {
        accountCode: formData.accountCode,
        name: formData.name,
        accountType: formData.accountType as
          | "ASSET"
          | "LIABILITY"
          | "EQUITY"
          | "INCOME"
          | "EXPENSE",
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      });

      if (result.success) {
        toast.success("Account updated successfully");
        setIsEditDialogOpen(false);
        setEditingAccount(null);
        resetForm();
        await loadAccounts();
      } else {
        toast.error(result.error || "Failed to update account");
      }
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to deactivate this account?")) {
      return;
    }

    try {
      const result = await deactivateAccount(accountId);
      if (result.success) {
        toast.success(result.message || "Account deactivated successfully");
        await loadAccounts();
      } else {
        toast.error(result.error || "Failed to deactivate account");
      }
    } catch (error) {
      console.error("Error deactivating account:", error);
      toast.error("Failed to deactivate account");
    }
  };

  const openEditDialog = (account: ChartAccount) => {
    setEditingAccount(account);
    setFormData({
      accountCode: account.accountCode,
      name: account.name,
      accountType: account.accountType,
      description: account.description || "",
      parentId: account.parentId || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      accountCode: "",
      name: "",
      accountType: "",
      description: "",
      parentId: "",
    });
  };

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType) {
      case "ASSET":
        return <Building className="h-4 w-4" />;
      case "LIABILITY":
        return <CreditCard className="h-4 w-4" />;
      case "EQUITY":
        return <DollarSign className="h-4 w-4" />;
      case "INCOME":
        return <TrendingUp className="h-4 w-4" />;
      case "EXPENSE":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType) {
      case "ASSET":
        return "bg-blue-100 text-blue-800";
      case "LIABILITY":
        return "bg-red-100 text-red-800";
      case "EQUITY":
        return "bg-green-100 text-green-800";
      case "INCOME":
        return "bg-emerald-100 text-emerald-800";
      case "EXPENSE":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Flatten accounts for table display
  const flattenedAccounts = accounts.flatMap((account) => [
    account,
    ...(account.subAccounts || []),
  ]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"].map((type) => {
          const typeAccounts = flattenedAccounts.filter(
            (acc) => acc.accountType === type
          );
          return (
            <Card key={type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{type}</CardTitle>
                {getAccountTypeIcon(type)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typeAccounts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {typeAccounts.filter((acc) => acc.isActive).length} active
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Accounts Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                Manage your business&apos;s general ledger accounts and account
                structure
              </CardDescription>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Account</DialogTitle>
                  <DialogDescription>
                    Add a new account to your chart of accounts
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accountCode">Account Code *</Label>
                      <Input
                        id="accountCode"
                        value={formData.accountCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            accountCode: e.target.value,
                          })
                        }
                        placeholder="e.g., 6010"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountType">Account Type *</Label>
                      <Select
                        value={formData.accountType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, accountType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ASSET">Asset</SelectItem>
                          <SelectItem value="LIABILITY">Liability</SelectItem>
                          <SelectItem value="EQUITY">Equity</SelectItem>
                          <SelectItem value="INCOME">Income</SelectItem>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">Account Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Advertising & Marketing"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional description of this account"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAccount}>Create Account</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading accounts...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedAccounts.slice(0, 10).map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono font-medium">
                      {account.accountCode}
                    </TableCell>
                    <TableCell className={account.parentId ? "pl-6" : ""}>
                      {account.parentId && "└ "}
                      {account.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getAccountTypeColor(account.accountType)}
                      >
                        {getAccountTypeIcon(account.accountType)}
                        <span className="ml-1">{account.accountType}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={account.isActive ? "default" : "secondary"}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!account.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAccount(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {flattenedAccounts.length > 10 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Showing first 10 accounts of {flattenedAccounts.length} total
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update the account details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editAccountCode">Account Code *</Label>
                <Input
                  id="editAccountCode"
                  value={formData.accountCode}
                  onChange={(e) =>
                    setFormData({ ...formData, accountCode: e.target.value })
                  }
                  placeholder="e.g., 6010"
                />
              </div>
              <div>
                <Label htmlFor="editAccountType">Account Type *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, accountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="editName">Account Name *</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Advertising & Marketing"
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description of this account"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditAccount}>Update Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
