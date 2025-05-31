"use client";

import { useState, useEffect } from "react";
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
import { Building, MapPin, Phone, Globe, Save, CreditCard } from "lucide-react";
import { toast } from "sonner";
import {
  getBusinessProfile,
  updateBusinessProfile,
  getBusinessStats,
  type BusinessStats,
} from "@/lib/actions/user-actions";

interface BusinessProfileForm {
  businessName: string;
  industry: string;
  address: string;
  taxId: string;
  phone: string;
  website: string;
}

const industries = [
  "Accounting & Finance",
  "Agriculture",
  "Arts & Entertainment",
  "Automotive",
  "Construction",
  "Consulting",
  "E-commerce",
  "Education",
  "Food & Beverage",
  "Healthcare",
  "Legal Services",
  "Manufacturing",
  "Marketing & Advertising",
  "Non-profit",
  "Professional Services",
  "Real Estate",
  "Retail",
  "Technology",
  "Transportation",
  "Other",
];

export function BusinessSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(
    null
  );
  const [formData, setFormData] = useState<BusinessProfileForm>({
    businessName: "",
    industry: "",
    address: "",
    taxId: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      setIsLoadingData(true);

      // Load business profile and stats in parallel
      const [profileResult, statsResult] = await Promise.all([
        getBusinessProfile(),
        getBusinessStats(),
      ]);

      if (profileResult.success && profileResult.data) {
        const profile = profileResult.data;
        setFormData({
          businessName: profile.businessName || "",
          industry: profile.industry || "",
          address: profile.address || "",
          taxId: profile.taxId || "",
          phone: profile.phone || "",
          website: profile.website || "",
        });
      } else if (profileResult.error) {
        toast.error(profileResult.error);
      }

      if (statsResult.success && statsResult.data) {
        setBusinessStats(statsResult.data);
      } else if (statsResult.error) {
        console.error("Failed to load business stats:", statsResult.error);
      }
    } catch {
      toast.error("Failed to load business data");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateBusinessProfile(formData);

      if (result.success) {
        toast.success("Business profile updated successfully");
        await loadBusinessData(); // Reload data
      } else {
        toast.error(result.error || "Failed to update business profile");
      }
    } catch {
      toast.error("Failed to update business profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof BusinessProfileForm,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading business data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Update your business details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <div className="relative">
                  <Building className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) =>
                      handleInputChange("businessName", e.target.value)
                    }
                    className="pl-8"
                    placeholder="Your business name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) =>
                    handleInputChange("industry", value)
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

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / EIN</Label>
                <div className="relative">
                  <CreditCard className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => handleInputChange("taxId", e.target.value)}
                    className="pl-8"
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-8"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className="pl-8"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <div className="relative">
                <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="pl-8 min-h-[100px]"
                  placeholder="Enter your complete business address"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Statistics</CardTitle>
          <CardDescription>
            Overview of your business activity on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {businessStats?.totalTransactions || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Transactions
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {businessStats?.totalDocuments || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Documents Uploaded
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {businessStats?.totalBankAccounts || 0}
              </div>
              <div className="text-sm text-muted-foreground">Bank Accounts</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
