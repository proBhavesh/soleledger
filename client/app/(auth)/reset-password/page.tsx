"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import { resetPassword, validatePasswordResetToken } from "@/lib/actions/auth-actions";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        const result = await validatePasswordResetToken(token);
        setIsValidToken(result.valid);
      } catch (error) {
        console.error("Error validating token:", error);
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  async function onSubmit(data: ResetPasswordData) {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setIsPending(true);
    
    try {
      const result = await resetPassword({
        token,
        password: data.password,
      });
      
      if (result.success) {
        setIsSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast.error(result.error || "Failed to reset password");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !isValidToken) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-center">Invalid or Expired Link</CardTitle>
            <CardDescription className="text-center">
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">Request new reset link</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-center">Password Reset Successful</CardTitle>
            <CardDescription className="text-center">
              Your password has been reset successfully. You will be redirected to the login page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset your password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                disabled={isPending}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                disabled={isPending}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Alert>
              <AlertDescription>
                Make sure your password is at least 8 characters long and includes a mix of letters, numbers, and symbols.
              </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}