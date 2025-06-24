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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Users,
  Landmark,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface BusinessInfo {
  name: string;
  industry: string;
  description: string;
  hasAccountant: boolean;
  accountantEmail?: string;
}

const industries = [
  "Technology",
  "Retail",
  "Healthcare",
  "Manufacturing",
  "Professional Services",
  "Real Estate",
  "Food & Beverage",
  "Construction",
  "Transportation",
  "Other",
];

export function BusinessSetup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: "",
    industry: "",
    description: "",
    hasAccountant: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Implement business creation API call
      console.log("Creating business:", businessInfo);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Business created successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating business:", error);
      toast.error("Failed to create business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return businessInfo.name.trim().length > 0 && businessInfo.industry;
      case 2:
        return true; // Description is optional
      case 3:
        return !businessInfo.hasAccountant || (businessInfo.hasAccountant && businessInfo.accountantEmail);
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up Your Business
          </h1>
          <p className="text-gray-600">
            Let&apos;s get your business profile set up so you can start managing your finances
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <Building2 className="h-5 w-5" />}
              {currentStep === 2 && <FileText className="h-5 w-5" />}
              {currentStep === 3 && <Users className="h-5 w-5" />}
              {currentStep === 1 && "Business Information"}
              {currentStep === 2 && "Business Details"}
              {currentStep === 3 && "Team Setup"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Tell us about your business"}
              {currentStep === 2 && "Add additional details about your business"}
              {currentStep === 3 && "Set up your team and accountant access"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Business Info */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Enter your business name"
                    value={businessInfo.name}
                    onChange={(e) =>
                      setBusinessInfo(prev => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select
                    value={businessInfo.industry}
                    onValueChange={(value) =>
                      setBusinessInfo(prev => ({ ...prev, industry: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe what your business does (optional)"
                    value={businessInfo.description}
                    onChange={(e) =>
                      setBusinessInfo(prev => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Landmark className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Next: Connect Your Bank Accounts</h4>
                      <p className="text-sm text-blue-700">
                        After setup, you&apos;ll be able to securely connect your business bank accounts 
                        to automatically sync transactions and streamline your bookkeeping.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Team Setup */}
            {currentStep === 3 && (
              <>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Do you work with an accountant?</h4>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="hasAccountant"
                          checked={!businessInfo.hasAccountant}
                          onChange={() => setBusinessInfo(prev => ({ ...prev, hasAccountant: false, accountantEmail: undefined }))}
                          className="text-indigo-600"
                        />
                        <span>No, I manage my finances myself</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="hasAccountant"
                          checked={businessInfo.hasAccountant}
                          onChange={() => setBusinessInfo(prev => ({ ...prev, hasAccountant: true }))}
                          className="text-indigo-600"
                        />
                        <span>Yes, I want to invite my accountant</span>
                      </label>
                    </div>
                  </div>

                  {businessInfo.hasAccountant && (
                    <div className="space-y-2">
                      <Label htmlFor="accountantEmail">Accountant&apos;s Email</Label>
                      <Input
                        id="accountantEmail"
                        type="email"
                        placeholder="accountant@example.com"
                        value={businessInfo.accountantEmail || ""}
                        onChange={(e) =>
                          setBusinessInfo(prev => ({ ...prev, accountantEmail: e.target.value }))
                        }
                      />
                      <p className="text-sm text-gray-500">
                        We&apos;ll send them an invitation to access your business data with the permissions you set.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-1">You&apos;re Almost Ready!</h4>
                      <p className="text-sm text-green-700">
                        Once you complete setup, you&apos;ll have access to your dashboard where you can 
                        connect bank accounts, upload receipts, and start tracking your finances.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!isStepValid() || isSubmitting}
                >
                  {isSubmitting ? "Creating Business..." : "Complete Setup"}
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}