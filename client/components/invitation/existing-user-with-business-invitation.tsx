"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, User, AlertTriangle } from "lucide-react";
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

export function ExistingUserWithBusinessInvitation({ 
  token, 
  invitation, 
  onSuccess 
}: ExistingUserWithBusinessInvitationProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

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
        body: JSON.stringify({ confirmBusinessCreation: true }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Access request approved! The accountant can now manage your books.");
        onSuccess();
      } else {
        toast.error(data.error || "Failed to approve access request");
      }
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      toast.error("An error occurred. Please try again.");
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

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Access request rejected");
        onSuccess();
      } else {
        toast.error(data.error || "Failed to reject access request");
      }
    } catch (error) {
      console.error("Failed to reject invitation:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <User className="h-6 w-6 text-blue-600" />
          <Badge variant="default">Accountant Access Request</Badge>
        </div>
        <CardTitle>Approve Accountant Access</CardTitle>
        <CardDescription>
          {invitation.senderName} wants to manage the books for {invitation.businessName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> You already have a business account. 
            This accountant is requesting permission to manage your books. 
            Only approve if you trust this person.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Accountant Details</h4>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{invitation.senderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{invitation.senderEmail}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Access Level: Full Management
            </h4>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-3">
                Complete access to manage all aspects of your business
              </p>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Create and edit transactions</li>
                <li>• Manage bank accounts</li>
                <li>• Process documents and receipts</li>
                <li>• Generate and export reports</li>
                <li>• Manage chart of accounts</li>
              </ul>
            </div>
          </div>
        </div>

        {needsAuth && (
          <Alert>
            <AlertDescription>
              Please sign in with the email address <strong>{invitation.email}</strong> to continue.
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
          Reject
        </Button>
        <Button 
          className="flex-1"
          onClick={needsAuth ? handleSignIn : handleAccept}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {needsAuth ? "Sign In to Continue" : "Approve Access"}
        </Button>
      </CardFooter>
    </Card>
  );
}