"use client";

import { useState } from "react";
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
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/auth-actions";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordData) {
    setIsPending(true);
    
    try {
      const result = await requestPasswordReset(data.email);
      
      if (result.success) {
        setIsSuccess(true);
        toast.success("Password reset link sent!");
      } else {
        toast.error(result.error || "Failed to send reset link");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent a password reset link to your email address. 
              Please check your inbox and follow the instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The link will expire in 1 hour. If you don&apos;t see the email, 
                please check your spam folder.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Forgot password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register("email")}
                disabled={isPending}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            <span className="flex items-center">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back to login
            </span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}