"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { MoreHorizontal, X, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAccountantInvitations, resendInvitation, cancelInvitation } from "@/lib/actions/client-management-actions";
import type { InvitationListItem } from "@/lib/types/invitation";

export function InvitationManagement() {
  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const result = await getAccountantInvitations();
      if (result.success && result.invitations) {
        setInvitations(result.invitations);
      } else {
        toast.error(result.error || "Failed to load invitations");
      }
    } catch (error) {
      console.error("[InvitationManagement] Error loading invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setActionLoading(invitationId);
    try {
      const result = await resendInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation resent successfully");
        await loadInvitations();
      } else {
        toast.error(result.error || "Failed to resend invitation");
      }
    } catch {
      toast.error("Failed to resend invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    setActionLoading(invitationId);
    try {
      const result = await cancelInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation cancelled");
        await loadInvitations();
      } else {
        toast.error(result.error || "Failed to cancel invitation");
      }
    } catch {
      toast.error("Failed to cancel invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "ACCEPTED":
        return <CheckCircle className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PENDING":
        return "default";
      case "ACCEPTED":
        return "secondary";
      case "REJECTED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getInvitationTypeLabel = (type: string) => {
    switch (type) {
      case "NEW_USER":
        return "New User";
      case "EXISTING_NO_BUSINESS":
        return "Existing User - No Business";
      case "EXISTING_WITH_BUSINESS":
        return "Existing User - Has Business";
      default:
        return type;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
          <CardDescription>
            View and manage your client invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitation History</CardTitle>
        <CardDescription>
          View and manage your client invitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No invitations sent yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {invitation.clientName || invitation.receiver?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">{invitation.email}</p>
                      {invitation.businessName && (
                        <p className="text-sm text-muted-foreground">
                          {invitation.businessName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getInvitationTypeLabel(invitation.invitationType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {invitation.accessLevel.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(invitation.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(invitation.status)}
                        {invitation.status}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(invitation.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <span className={isExpired(invitation.expiresAt) ? "text-destructive" : ""}>
                      {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {invitation.status === "PENDING" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={actionLoading === invitation.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleResend(invitation.id)}
                            disabled={actionLoading === invitation.id}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Resend Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCancel(invitation.id)}
                            disabled={actionLoading === invitation.id}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}