"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userRegistrationSchema } from "@/lib/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { registerAction } from "@/lib/actions/auth-actions";
import { BriefcaseIcon, CalculatorIcon } from "lucide-react";

type FormData = z.infer<typeof userRegistrationSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "BUSINESS_OWNER",
      acceptTerms: false,
    },
  });

  // Handle role select since it's not a native input that works with react-hook-form
  const handleRoleChange = (value: string) => {
    setValue("role", value as "BUSINESS_OWNER" | "ACCOUNTANT" | "ADMIN");
  };

  const watchAcceptTerms = watch("acceptTerms");
  const watchRole = watch("role");

  async function onSubmit(data: FormData) {
    setIsPending(true);

    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("role", data.role);
      formData.append("acceptTerms", data.acceptTerms.toString());

      const result = await registerAction(formData);

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);

        // Auto-login the user if credentials are returned
        if (result.autoLogin && result.email) {
          try {
            // Sign in the user automatically
            const signInResult = await signIn("credentials", {
              email: result.email,
              password: data.password,
              redirect: false,
            });

            if (signInResult?.error) {
              toast.error("Auto-login failed. Please sign in manually.");
              router.push("/login");
            } else {
              // Redirect to pricing page
              toast.success("Welcome to SoleLedger! Choose your plan.");
              router.push("/pricing");
            }
          } catch (signInError) {
            console.error("Auto-login error:", signInError);
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl: "/pricing" });
    } catch (error) {
      toast.error("Failed to sign in with Google");
      console.error(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Create your account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your details to sign up for SoleLedger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Type Selection */}
            <div className="space-y-3">
              <Label className="text-base">Select your account type</Label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    watchRole === "BUSINESS_OWNER"
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground"
                  }`}
                  onClick={() => handleRoleChange("BUSINESS_OWNER")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <BriefcaseIcon
                      className={`h-8 w-8 ${
                        watchRole === "BUSINESS_OWNER"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">Business Owner</span>
                    <p className="text-xs text-muted-foreground">
                      Manage a single business &amp; finances
                    </p>
                  </div>
                </div>
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    watchRole === "ACCOUNTANT"
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground"
                  }`}
                  onClick={() => handleRoleChange("ACCOUNTANT")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <CalculatorIcon
                      className={`h-8 w-8 ${
                        watchRole === "ACCOUNTANT"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">Accountant</span>
                    <p className="text-xs text-muted-foreground">
                      Manage multiple client businesses
                    </p>
                  </div>
                </div>
              </div>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...register("name")}
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                disabled={isPending}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="acceptTerms"
                checked={watchAcceptTerms}
                onCheckedChange={(checked) => {
                  setValue("acceptTerms", checked === true);
                }}
                disabled={isPending}
              />
              <Label htmlFor="acceptTerms" className="text-sm font-normal">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-500">
                {errors.acceptTerms.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              variant="outline"
              type="button"
              disabled={isPending}
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Continue with Google
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
