"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";

interface NewUserInvitationProps {
  token: string;
  invitation: {
    email: string;
    clientName: string;
    businessName: string;
    senderName: string;
    accessLevel: string;
  };
  onSuccess: () => void;
}

export function NewUserInvitation({ token, invitation, onSuccess }: NewUserInvitationProps) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAccept = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to accept invitation");
        return;
      }

      toast.success("Account created successfully! Redirecting to login...");
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
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              By accepting this invitation, you&apos;ll create a SoleLedger account and 
              grant {invitation.senderName} access to manage your bookkeeping with 
              <strong> {invitation.accessLevel.replace(/_/g, " ").toLowerCase()}</strong> permissions.
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
            onClick={handleAccept}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept & Create Account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}