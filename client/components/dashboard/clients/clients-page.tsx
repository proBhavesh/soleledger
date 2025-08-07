"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  ArrowRight,
  Plus,
  Eye,
} from "lucide-react";
import { useBusinessContext } from "@/lib/contexts/business-context";
import { getUserBusinesses } from "@/lib/actions/business-context-actions";
import type { UserBusiness } from "@/lib/types/business-context";
import { AddClientDialog } from "./add-client-dialog";
import { InvitationManagement } from "./invitation-management";

interface ClientsPageProps {
  initialBusinesses: UserBusiness[];
}

export function ClientsPage({ initialBusinesses }: ClientsPageProps) {
  const [businesses, setBusinesses] = useState<UserBusiness[]>(initialBusinesses);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { setSelectedBusinessId, setAvailableBusinesses } = useBusinessContext();
  const router = useRouter();

  const handleViewClient = (businessId: string) => {
    // Set the business context and redirect to dashboard
    setSelectedBusinessId(businessId);
    router.push("/dashboard");
  };

  const handleClientAdded = async () => {
    // Refresh the businesses list after invitation is sent
    try {
      const result = await getUserBusinesses();
      if (result.success && result.businesses) {
        setBusinesses(result.businesses);
        setAvailableBusinesses(result.businesses); // Update context too
      } else {
        console.error("Failed to refresh businesses:", result.error);
      }
    } catch (error) {
      console.error("Failed to refresh businesses list:", error);
    }
  };


  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "BUSINESS_OWNER":
        return "default";
      case "ACCOUNTANT":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "BUSINESS_OWNER":
        return "Owner";
      case "ACCOUNTANT":
        return "Member";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage and access your client businesses
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses.length}</div>
            <p className="text-xs text-muted-foreground">
              Active business relationships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owned Businesses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businesses.filter(b => b.role === "BUSINESS_OWNER").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Businesses you own
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Access</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businesses.filter(b => b.role === "ACCOUNTANT").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Client businesses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
          <CardDescription>
            Click on any client to access their business dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {businesses.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any client businesses yet. Start by adding your first client.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Your Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map((business) => (
                  <TableRow 
                    key={business.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewClient(business.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{business.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Business ID: {business.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(business.role)}>
                        {getRoleLabel(business.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewClient(business.id);
                          }}
                          className="flex items-center gap-2"
                        >
                          View Dashboard
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddClientDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleClientAdded}
      />

      {/* Invitation Management */}
      <InvitationManagement />
    </div>
  );
}