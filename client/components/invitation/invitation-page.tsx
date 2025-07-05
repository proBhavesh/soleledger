"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
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
}

interface InvitationPageProps {
  token: string;
}

export function InvitationPage({ token }: InvitationPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to validate invitation");
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || "This invitation is invalid or has expired."}
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <a href="/login" className="text-sm text-primary hover:underline">
                Go to login
              </a>
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
          onSuccess={() => router.push("/login?invited=true")}
        />
      );
    
    case "EXISTING_NO_BUSINESS":
      return (
        <ExistingUserNoBusinessInvitation
          token={token}
          invitation={invitation}
          onSuccess={() => router.push("/dashboard?business-created=true")}
        />
      );
    
    case "EXISTING_WITH_BUSINESS":
      return (
        <ExistingUserWithBusinessInvitation
          token={token}
          invitation={invitation}
          onSuccess={() => router.push("/dashboard?access-granted=true")}
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
                  Unknown invitation type
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      );
  }
}