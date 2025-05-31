"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Upload, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from "@/lib/actions/user-actions";

export function ProfileSettings() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const result = await getUserProfile();
      if (result.success && result.data) {
        setUserProfile(result.data);
        setFormData({
          name: result.data.name,
          email: result.data.email,
        });
      } else {
        toast.error(result.error || "Failed to load profile");
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateUserProfile(formData);

      if (result.success) {
        await update({
          name: formData.name,
        });
        await loadUserProfile(); // Reload profile data
        toast.success("Profile updated successfully");
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading profile...</p>
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
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={userProfile?.image || session?.user?.image || ""}
              />
              <AvatarFallback className="text-lg">
                {userProfile?.name ? getUserInitials(userProfile.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Change Picture
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG up to 2MB
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="pl-8"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="pl-8"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {userProfile?.role?.replace("_", " ") || "User"}
                </Badge>
                {userProfile?.emailVerified && (
                  <Badge className="bg-green-100 text-green-800">
                    Email Verified
                  </Badge>
                )}
              </div>
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
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Your account information and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Account Created</span>
              <span className="text-sm text-muted-foreground">
                {userProfile?.createdAt
                  ? new Date(userProfile.createdAt).toLocaleDateString()
                  : "Unknown"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Email Status</span>
              <Badge
                variant={userProfile?.emailVerified ? "default" : "destructive"}
              >
                {userProfile?.emailVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Account Type</span>
              <Badge variant="outline">
                {userProfile?.role?.replace("_", " ") || "User"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
