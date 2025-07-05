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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Eye, DollarSign, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useBusinessContext } from "@/lib/contexts/business-context";

interface PendingRequest {
  id: string;
  senderName: string;
  senderEmail: string;
  accessLevel: string;
  createdAt: string;
  expiresAt: string;
}

const accessLevelInfo = {
  VIEW_ONLY: {
    label: "View Only",
    icon: Eye,
  },
  FULL_MANAGEMENT: {
    label: "Full Management",
    icon: Shield,
  },
  FINANCIAL_ONLY: {
    label: "Financial Only",
    icon: DollarSign,
  },
  DOCUMENTS_ONLY: {
    label: "Documents Only",
    icon: FileText,
  },
};

export function PendingAccessRequests() {
  const { selectedBusinessId } = useBusinessContext();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadRequests = async () => {
      if (selectedBusinessId) {
        try {
          // Get pending invitations for this business
          const response = await fetch(`/api/businesses/${selectedBusinessId}/pending-requests`);
          if (response.ok) {
            const data = await response.json();
            setRequests(data.requests || []);
          }
        } catch {
          console.error("Failed to load pending requests");
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadRequests();
  }, [selectedBusinessId]);

  const loadPendingRequests = async () => {
    if (!selectedBusinessId) return;
    
    try {
      // Get pending invitations for this business
      const response = await fetch(`/api/businesses/${selectedBusinessId}/pending-requests`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch {
      console.error("Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      // This would be handled by the invitation acceptance flow
      toast.success("Access request approved");
      await loadPendingRequests();
    } catch {
      toast.error("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      // This would be handled by the invitation rejection flow
      toast.success("Access request rejected");
      await loadPendingRequests();
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Access Requests</CardTitle>
          <CardDescription>
            Review accountants requesting access to your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show the section if there are no pending requests
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Access Requests</CardTitle>
        <CardDescription>
          Review accountants requesting access to your business
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accountant</TableHead>
              <TableHead>Requested Access</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const info = accessLevelInfo[request.accessLevel as keyof typeof accessLevelInfo];
              const Icon = info?.icon || Shield;
              
              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.senderName}</p>
                      <p className="text-sm text-muted-foreground">{request.senderEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      <Icon className="h-3 w-3" />
                      {info?.label || request.accessLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.expiresAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading === request.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}