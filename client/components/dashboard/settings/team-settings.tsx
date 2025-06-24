"use client";

import { TeamManagement } from "@/components/business/team-management";

interface TeamSettingsProps {
  businessId: string;
  isOwner: boolean;
}

export function TeamSettings({ businessId, isOwner }: TeamSettingsProps) {
  return (
    <div className="space-y-4">
      <TeamManagement businessId={businessId} isOwner={isOwner} />
    </div>
  );
}