"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { signIn, useSession } from "next-auth/react";

interface ExistingUserNoBusinessInvitationProps {
  token: string;
  invitation: {
    email: string;
    clientName: string;
    businessName: string;
    senderName: string;
    senderEmail: string;
    accessLevel: string;
    hasExistingUser: boolean;
  };
  onSuccess: () => void;
}

export function ExistingUserNoBusinessInvitation({ 
  token, 
  invitation, 
  onSuccess 
}: ExistingUserNoBusinessInvitationProps) {
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user?.email === invitation.email;

  const handleSignIn = async () => {
    // Redirect to login with callback URL
    const callbackUrl = `/invite/${token}`;
    signIn(undefined, { callbackUrl });
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmBusinessCreation: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If unauthorized, prompt to sign in
        if (response.status === 401) {
          toast.error("Please sign in first to accept this invitation");
          handleSignIn();
          return;
        }
        toast.error(data.error || "Failed to accept invitation");
        return;
      }

      toast.success("Business created successfully!");
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

      toast.success("Invitation declined");
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
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
          <CardDescription>
            Your accountant is ready to manage your books
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>{invitation.senderName}</strong> ({invitation.senderEmail}) wants to 
              manage the bookkeeping for <strong>{invitation.businessName}</strong>.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium">What happens when you accept:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Your business &quot;{invitation.businessName}&quot; will be created</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>{invitation.senderName} will get {invitation.accessLevel.replace(/_/g, " ").toLowerCase()} access</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>You&apos;ll have full owner access to your business</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>A standard chart of accounts will be set up</span>
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <Alert>
              <AlertDescription className="text-sm">
                You&apos;ll need to sign in to your existing SoleLedger account ({invitation.email}) 
                to accept this invitation.
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
            Decline
          </Button>
          {!isAuthenticated ? (
            <Button
              className="flex-1"
              onClick={handleSignIn}
              disabled={loading}
            >
              Sign In to Accept
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept & Create Business
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}