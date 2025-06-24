"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { useBusinessContext } from "@/lib/contexts/business-context";

export function BusinessSelector() {
  const {
    selectedBusinessId,
    setSelectedBusinessId,
    isAccountant,
    availableBusinesses,
    isLoading,
  } = useBusinessContext();

  // Handle business selection change
  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId);
    // The dashboard will automatically update when selectedBusinessId changes
  };

  // Don't show selector for business owners with only their own business
  if (!isAccountant && availableBusinesses.length <= 1) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
        <Building2 className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Show error state if no businesses available
  if (availableBusinesses.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-destructive/10 rounded-lg">
        <Building2 className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">No businesses available</span>
      </div>
    );
  }


  return (
    <Select value={selectedBusinessId || ""} onValueChange={handleBusinessChange}>
      <SelectTrigger className="w-full bg-background border-border h-9">
        <div className="flex items-center space-x-2 w-full">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <SelectValue 
            placeholder="Select client..."
            className="text-sm truncate"
          />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableBusinesses.map((business) => (
          <SelectItem key={business.id} value={business.id}>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium truncate pr-2">{business.name}</span>
              <Badge 
                variant={business.role === "BUSINESS_OWNER" ? "default" : "secondary"}
                className="text-xs flex-shrink-0"
              >
                {business.role === "BUSINESS_OWNER" ? "Owner" : "Member"}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}