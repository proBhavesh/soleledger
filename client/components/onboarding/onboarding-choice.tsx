"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  ArrowRight,
  CheckCircle,
  Shield,
  Zap,
} from "lucide-react";

export function OnboardingChoice() {
  const router = useRouter();
  const [selectedPath, setSelectedPath] = useState<"business" | "accountant" | null>(null);

  const handleBusinessOwnerPath = () => {
    // Direct signup as business owner
    router.push("/onboarding/business-setup");
  };

  const handleAccountantPath = () => {
    // Accountant signup flow
    router.push("/onboarding/accountant-setup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to SoleLedger
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose how you&apos;d like to use SoleLedger to get started with the right setup for your needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Business Owner Path */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedPath === "business" ? "ring-2 ring-indigo-500 shadow-lg" : ""
            }`}
            onClick={() => setSelectedPath("business")}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle className="text-2xl">I&apos;m a Business Owner</CardTitle>
              <CardDescription className="text-base">
                I want to manage my own business finances and may work with an accountant later
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Full control over your financial data</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Connect your bank accounts securely</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Invite accountants with custom access levels</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Automated transaction categorization</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6" 
                onClick={handleBusinessOwnerPath}
                disabled={selectedPath !== null && selectedPath !== "business"}
              >
                Get Started as Business Owner
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Accountant Path */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedPath === "accountant" ? "ring-2 ring-purple-500 shadow-lg" : ""
            }`}
            onClick={() => setSelectedPath("accountant")}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">I&apos;m an Accountant</CardTitle>
              <CardDescription className="text-base">
                I want to manage multiple client businesses and provide accounting services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm">Manage multiple client businesses</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm">Client-controlled access permissions</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm">Invitation-based client onboarding</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm">Streamlined workflow for accounting tasks</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6" 
                variant="outline"
                onClick={handleAccountantPath}
                disabled={selectedPath !== null && selectedPath !== "accountant"}
              >
                Get Started as Accountant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Don&apos;t worry - you can change your setup or add additional roles later
          </p>
        </div>
      </div>
    </div>
  );
}