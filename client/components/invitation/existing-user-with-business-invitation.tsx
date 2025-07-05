"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, User, AlertTriangle, Eye, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

interface ExistingUserWithBusinessInvitationProps {
  token: string;
  invitation: {
    email: string;
    clientName: string;
    businessName: string;
    senderName: string;
    senderEmail: string;
    accessLevel: string;
  };
  onSuccess: () => void;
}

const accessLevelInfo = {
  VIEW_ONLY: {
    label: "View Only",
    description: "Can view all data but cannot make changes",
    icon: Eye,
    permissions: [
      "View all transactions and reports",
      "Export financial data",
      "View documents and receipts",
    ],
  },
  FULL_MANAGEMENT: {
    label: "Full Management",
    description: "Complete access to manage all aspects",
    icon: Shield,
    permissions: [
      "Create and edit transactions",
      "Manage bank accounts",
      "Process documents and receipts",
      "Generate and export reports",
      "Manage chart of accounts",
    ],
  },
  FINANCIAL_ONLY: {
    label: "Financial Only",
    description: "Manage transactions, accounts, and reports",
    icon: DollarSign,
    permissions: [
      "Create and edit transactions",
      "Manage bank accounts",
      "Generate financial reports",
      "Manage chart of accounts",
    ],
  },
  DOCUMENTS_ONLY: {
    label: "Documents Only",
    description: "Manage receipts, invoices, and reconciliation",
    icon: FileText,
    permissions: [
      "Upload and process receipts",
      "Manage document categorization",
      "Handle invoice processing",
      "Perform reconciliation",
    ],
  },
};

export function ExistingUserWithBusinessInvitation({ 
  token, 
  invitation, 
  onSuccess 
}: ExistingUserWithBusinessInvitationProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  const accessInfo = accessLevelInfo[invitation.accessLevel as keyof typeof accessLevelInfo] || accessLevelInfo.VIEW_ONLY;
  const AccessIcon = accessInfo.icon;

  useEffect(() => {
    // Check if user is authenticated and matches the invitation email
    if (status === "unauthenticated" || (session?.user?.email !== invitation.email)) {
      setNeedsAuth(true);
    } else {
      setNeedsAuth(false);
    }
  }, [session, status, invitation.email]);

  const handleSignIn = () => {
    const callbackUrl = `/invite/${token}`;
    signIn(undefined, { callbackUrl });
  };

  const handleAccept = async () => {
    if (needsAuth) {
      handleSignIn();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to accept invitation");
        return;
      }

      toast.success("Access granted successfully!");
      setTimeout(onSuccess, 2000);
    } catch {
      toast.error("Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/${token}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        toast.error("Failed to reject invitation");
        return;
      }

      toast.success("Access request declined");
      setTimeout(() => window.location.href = "/", 2000);
    } catch {
      toast.error("Failed to reject invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Accountant Access Request</CardTitle>
          <CardDescription>
            Review and approve access to your business
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>{invitation.senderName}</strong> ({invitation.senderEmail}) is requesting 
              access to manage the books for <strong>{invitation.businessName}</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AccessIcon className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{accessInfo.label}</p>
                  <p className="text-sm text-muted-foreground">{accessInfo.description}</p>
                </div>
              </div>
              <Badge variant="secondary">{invitation.accessLevel.replace(/_/g, " ")}</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">This accountant will be able to:</p>
              <ul className="space-y-1">
                {accessInfo.permissions.map((permission, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              You can change or revoke this access at any time from your dashboard under 
              Settings → Team Members.
            </AlertDescription>
          </Alert>

          {needsAuth && (
            <Alert>
              <AlertDescription className="text-sm">
                Please sign in to your SoleLedger account ({invitation.email}) to manage this request.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleReject}
            disabled={loading}
          >
            Decline Request
          </Button>
          {needsAuth ? (
            <Button
              className="flex-1"
              onClick={handleSignIn}
              disabled={loading}
            >
              Sign In to Review
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Access
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}