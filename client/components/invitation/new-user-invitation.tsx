"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, User, Shield, Chrome, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

interface NewUserInvitationProps {
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

export function NewUserInvitation({ token, invitation, onSuccess }: NewUserInvitationProps) {
  const [authMethod, setAuthMethod] = useState<"password" | "oauth">("oauth");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const validatePassword = () => {
    const newErrors: typeof errors = {};
    
    if (authMethod === "password") {
      if (!password) {
        newErrors.password = "Password is required";
      } else if (password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAcceptWithPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    setErrors({});
    
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password,
          authMethod: "password"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || "Failed to create account" });
        return;
      }

      toast.success("Account created successfully! Please sign in with your password.");
      
      // Add a delay before redirect to show the success message
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      setErrors({ general: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptWithOAuth = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      // First, create the user account with OAuth flag
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          authMethod: "oauth"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || "Failed to prepare account" });
        return;
      }

      toast.success("Account prepared! Redirecting to Google sign-in...");
      
      // Redirect to Google OAuth with the email pre-filled
      setTimeout(() => {
        signIn("google", {
          callbackUrl: "/dashboard",
          loginHint: invitation.email, // Pre-fill the email in Google's sign-in
        });
      }, 1500);
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      setErrors({ general: "An error occurred. Please try again." });
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
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to SoleLedger!</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as a client
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>{invitation.senderName}</strong> has invited you to use SoleLedger 
              for managing the books for <strong>{invitation.businessName}</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Email</Label>
              <Input value={invitation.email} disabled />
            </div>

            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input value={invitation.clientName} disabled />
            </div>

            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={invitation.businessName} disabled />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Choose how to create your account</Label>
            <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "password" | "oauth")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth" className="flex items-center gap-2">
                  <Chrome className="h-4 w-4" />
                  Sign up with Google
                </TabsTrigger>
                <TabsTrigger value="password" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Create Password
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oauth" className="space-y-4">
                <Alert>
                  <Chrome className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Recommended: Sign up with Google</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• No password to remember</li>
                        <li>• More secure with 2-factor authentication</li>
                        <li>• Quick sign-in every time</li>
                      </ul>
                      <p className="text-sm mt-2">
                        You&apos;ll be redirected to Google to complete sign-up using <strong>{invitation.email}</strong>
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="password" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors(prev => ({ ...prev, password: undefined }));
                      }
                    }}
                    placeholder="Enter a secure password"
                    disabled={loading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    Your password must be at least 8 characters long. 
                    We&apos;ll send you an email to verify your account after sign-up.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </div>

          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              By accepting this invitation, you&apos;ll create a SoleLedger account and 
              grant {invitation.senderName} access to manage your bookkeeping with 
              <strong> full management</strong> permissions.
            </AlertDescription>
          </Alert>
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
          <Button
            className="flex-1"
            onClick={authMethod === "oauth" ? handleAcceptWithOAuth : handleAcceptWithPassword}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {authMethod === "oauth" ? "Continue with Google" : "Create Account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}