"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { NewUserInvitation } from "./new-user-invitation";
import { ExistingUserNoBusinessInvitation } from "./existing-user-no-business-invitation";
import { ExistingUserWithBusinessInvitation } from "./existing-user-with-business-invitation";

interface InvitationData {
  id: string;
  email: string;
  clientName: string;
  businessName: string;
  invitationType: "NEW_USER" | "EXISTING_NO_BUSINESS" | "EXISTING_WITH_BUSINESS";
  accessLevel: string;
  senderName: string;
  senderEmail: string;
  expiresAt: string;
  hasExistingUser: boolean;
  userAuthProvider?: string | null;
}

interface InvitationPageProps {
  token: string;
}

export function InvitationPage({ token }: InvitationPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const fetchInvitation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/invitations/${token}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          setError("This invitation link is invalid or has expired.");
        } else if (response.status === 410) {
          setError("This invitation has expired. Please request a new one from your accountant.");
        } else if (response.status === 400) {
          setError(data.error || "This invitation has already been used.");
        } else {
          setError(data.error || "Failed to validate invitation");
        }
        return;
      }

      setInvitation(data.invitation);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error("Failed to fetch invitation:", err);
      
      // Network error - allow retry
      if (retryCount < maxRetries) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Unable to load invitation after multiple attempts. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, retryCount, maxRetries]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchInvitation();
  };

  const handleSuccess = () => {
    // Clear any cached data
    setInvitation(null);
    
    // Redirect based on invitation type
    if (invitation?.invitationType === "NEW_USER") {
      router.push("/login?invited=true");
    } else if (invitation?.invitationType === "EXISTING_NO_BUSINESS") {
      router.push("/dashboard?business-created=true");
    } else {
      router.push("/dashboard?access-granted=true");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || "This invitation is invalid or has expired."}
              </AlertDescription>
            </Alert>
            
            {error?.includes("Network error") && retryCount < maxRetries && (
              <Button 
                onClick={handleRetry} 
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({retryCount}/{maxRetries})
              </Button>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/")}
              >
                Go to Home
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push("/login")}
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the appropriate component based on invitation type
  switch (invitation.invitationType) {
    case "NEW_USER":
      return (
        <NewUserInvitation
          token={token}
          invitation={invitation}
          onSuccess={handleSuccess}
        />
      );
    
    case "EXISTING_NO_BUSINESS":
      return (
        <ExistingUserNoBusinessInvitation
          token={token}
          invitation={invitation}
          onSuccess={handleSuccess}
        />
      );
    
    case "EXISTING_WITH_BUSINESS":
      return (
        <ExistingUserWithBusinessInvitation
          token={token}
          invitation={invitation}
          onSuccess={handleSuccess}
        />
      );
    
    default:
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-10">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unknown invitation type. Please contact support.
                </AlertDescription>
              </Alert>
              <div className="mt-4 text-center">
                <Button onClick={() => router.push("/login")}>
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
  }
}