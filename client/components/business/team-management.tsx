"use client";

import { useState, useEffect, useCallback } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  UserPlus,
  MoreHorizontal,
  Eye,
  Settings,
  Trash2,
  Mail,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BusinessAccessLevel,
  accessLevelLabels,
  accessLevelDescriptions,
  type BusinessMemberWithUser,
  type InviteMemberData,
} from "@/lib/types/business-access";
import {
  inviteMemberToBusiness,
  getBusinessMembers,
  updateMemberAccess,
  removeMemberFromBusiness,
} from "@/lib/actions/member-management-actions";

interface TeamManagementProps {
  businessId: string;
  isOwner: boolean;
}

export function TeamManagement({ businessId, isOwner }: TeamManagementProps) {
  const [members, setMembers] = useState<BusinessMemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteMemberData>({
    email: "",
    accessLevel: BusinessAccessLevel.VIEW_ONLY,
    message: "",
  });

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBusinessMembers(businessId);
      if (result.success && result.members) {
        setMembers(result.members);
      } else {
        toast.error(result.error || "Failed to load team members");
      }
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Load members
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInviteMember = async () => {
    if (!inviteForm.email || !inviteForm.accessLevel) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsInviting(true);
    try {
      const result = await inviteMemberToBusiness(businessId, inviteForm);
      if (result.success) {
        toast.success("Invitation sent successfully!");
        setInviteForm({
          email: "",
          accessLevel: BusinessAccessLevel.VIEW_ONLY,
          message: "",
        });
        setIsInviteDialogOpen(false);
        loadMembers(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateAccess = async (memberId: string, newAccessLevel: BusinessAccessLevel) => {
    try {
      const result = await updateMemberAccess(businessId, memberId, newAccessLevel);
      if (result.success) {
        toast.success("Access level updated successfully!");
        loadMembers(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to update access level");
      }
    } catch (error) {
      console.error("Error updating access:", error);
      toast.error("Failed to update access level");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const result = await removeMemberFromBusiness(businessId, memberId);
      if (result.success) {
        toast.success("Member removed successfully!");
        loadMembers(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const getAccessLevelBadgeVariant = (accessLevel: BusinessAccessLevel) => {
    switch (accessLevel) {
      case BusinessAccessLevel.FULL_MANAGEMENT:
        return "default";
      case BusinessAccessLevel.FINANCIAL_ONLY:
        return "secondary";
      case BusinessAccessLevel.DOCUMENTS_ONLY:
        return "outline";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Manage who has access to your business data and what they can do
            </CardDescription>
          </div>
          {isOwner && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading team members...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
            <p className="text-muted-foreground mb-4">
              Invite accountants or team members to help manage your business
            </p>
            {isOwner && (
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Your First Member
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Joined</TableHead>
                {isOwner && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.image || ""} alt={member.user.name || ""} />
                        <AvatarFallback className="text-xs">
                          {member.user.name ? getInitials(member.user.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.user.name || "Unnamed User"}</div>
                        <div className="text-sm text-muted-foreground">{member.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getAccessLevelBadgeVariant(member.accessLevel)}>
                      {accessLevelLabels[member.accessLevel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Pending"}
                    </div>
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleUpdateAccess(member.id, BusinessAccessLevel.VIEW_ONLY)}
                            disabled={member.accessLevel === BusinessAccessLevel.VIEW_ONLY}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Only
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateAccess(member.id, BusinessAccessLevel.FINANCIAL_ONLY)}
                            disabled={member.accessLevel === BusinessAccessLevel.FINANCIAL_ONLY}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Financial Only
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateAccess(member.id, BusinessAccessLevel.FULL_MANAGEMENT)}
                            disabled={member.accessLevel === BusinessAccessLevel.FULL_MANAGEMENT}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Full Management
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Invite Member Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to someone to join your business team
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select
                  value={inviteForm.accessLevel}
                  onValueChange={(value: BusinessAccessLevel) =>
                    setInviteForm((prev) => ({ ...prev, accessLevel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(accessLevelLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex flex-col">
                          <span>{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {accessLevelDescriptions[value as BusinessAccessLevel]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to your invitation..."
                  value={inviteForm.message}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button onClick={handleInviteMember} disabled={isInviting}>
                {isInviting ? "Sending..." : "Send Invitation"}
                <Mail className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}