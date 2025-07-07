"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Building,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { getUsageData } from "@/lib/actions/usage-actions";
import { type UsageData } from "@/lib/types/usage";
import Link from "next/link";

interface UsageItemProps {
  icon: React.ElementType;
  title: string;
  used: number;
  limit: number | null;
  percentage: number;
  unit: string;
}

function UsageItem({ icon: Icon, title, used, limit, percentage, unit }: UsageItemProps) {
  const isUnlimited = limit === null;
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {used.toLocaleString()} {isUnlimited ? unit : `/ ${limit?.toLocaleString()} ${unit}`}
          </span>
          {isUnlimited && (
            <Badge variant="secondary" className="text-xs">
              Unlimited
            </Badge>
          )}
          {isNearLimit && !isAtLimit && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
              Near Limit
            </Badge>
          )}
          {isAtLimit && (
            <Badge variant="destructive" className="text-xs">
              Limit Reached
            </Badge>
          )}
        </div>
      </div>
      {!isUnlimited && (
        <Progress value={percentage} className={isAtLimit ? "bg-red-100" : isNearLimit ? "bg-orange-100" : ""} />
      )}
    </div>
  );
}

export function UsageTracker() {
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setIsLoading(true);
      const result = await getUsageData();
      
      if (result.success && result.data) {
        setUsageData(result.data);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to load usage data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading usage data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load usage data</p>
            <Button onClick={loadUsageData} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyLimit = 
    usageData.transactions.percentage >= 80 ||
    usageData.bankAccounts.percentage >= 80 ||
    usageData.documentUploads.percentage >= 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage & Limits
            </CardTitle>
            <CardDescription>
              Track your monthly usage across all features
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{usageData.currentPlan.name}</Badge>
            {hasAnyLimit && (
              <Link href="/dashboard/settings?tab=subscription">
                <Button size="sm" variant="outline">
                  Upgrade Plan
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Items */}
        <div className="space-y-4">
          <UsageItem
            icon={FileText}
            title="Transactions"
            used={usageData.transactions.used}
            limit={usageData.transactions.limit}
            percentage={usageData.transactions.percentage}
            unit="transactions"
          />
          
          <UsageItem
            icon={Building}
            title="Bank Accounts"
            used={usageData.bankAccounts.used}
            limit={usageData.bankAccounts.limit}
            percentage={usageData.bankAccounts.percentage}
            unit="accounts"
          />
          
          <UsageItem
            icon={Receipt}
            title="Document Uploads"
            used={usageData.documentUploads.used}
            limit={usageData.documentUploads.limit}
            percentage={usageData.documentUploads.percentage}
            unit="documents"
          />
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-600 dark:text-blue-400">
            <p className="font-medium">Usage resets monthly</p>
            <p>Your usage limits reset on the first day of each month. Bank account limits apply to your total connected accounts.</p>
          </div>
        </div>

        {/* Upgrade CTA if near limits */}
        {hasAnyLimit && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Need more capacity?</h4>
                <p className="text-sm text-muted-foreground">
                  Upgrade your plan to increase your limits and unlock more features.
                </p>
              </div>
              <Link href="/pricing">
                <Button>
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}