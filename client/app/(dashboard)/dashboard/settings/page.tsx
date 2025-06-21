"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/dashboard/settings/profile-settings";
import { BusinessSettings } from "@/components/dashboard/settings/business-settings";
import { SubscriptionSettings } from "@/components/dashboard/settings/subscription-settings";
import { ChartOfAccountsSettings } from "@/components/dashboard/settings/chart-of-accounts-settings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, business, and billing preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <BusinessSettings />
        </TabsContent>

        <TabsContent value="chart-of-accounts" className="space-y-4">
          <ChartOfAccountsSettings />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <SubscriptionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
