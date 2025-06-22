"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { refreshTransactions } from "@/lib/actions/plaid";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncStatusProps {
  bankAccounts: Array<{
    id: string;
    name: string;
    lastSync?: Date | null;
    institution?: string | null;
    balance?: number | null;
  }>;
  onSyncComplete?: () => void;
}

export function SyncStatus({ bankAccounts, onSyncComplete }: SyncStatusProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, Date>>({});

  useEffect(() => {
    // Initialize last sync times
    const times: Record<string, Date> = {};
    bankAccounts.forEach(account => {
      if (account.lastSync) {
        times[account.id] = new Date(account.lastSync);
      }
    });
    setLastSyncTimes(times);
  }, [bankAccounts]);

  const getTimeSinceSync = (lastSync: Date | null | undefined): string => {
    if (!lastSync) return "Never synced";
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastSync).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  const getMostRecentSync = (): Date | null => {
    const times = Object.values(lastSyncTimes);
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map(t => t.getTime())));
  };

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    
    try {
      // Refresh each account
      const results = await Promise.allSettled(
        bankAccounts.map(account => refreshTransactions(account.id))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed === 0) {
        toast.success("All accounts synced successfully");
      } else {
        toast.warning(`Synced ${successful} accounts, ${failed} failed`);
      }
      
      // Update last sync times
      const newTimes = { ...lastSyncTimes };
      bankAccounts.forEach(account => {
        newTimes[account.id] = new Date();
      });
      setLastSyncTimes(newTimes);
      
      onSyncComplete?.();
    } catch {
      toast.error("Failed to sync accounts");
    } finally {
      setIsSyncing(false);
    }
  };

  const mostRecentSync = getMostRecentSync();
  const syncAge = mostRecentSync ? getTimeSinceSync(mostRecentSync) : "Never synced";
  const isStale = mostRecentSync ? 
    (new Date().getTime() - mostRecentSync.getTime()) > 3600000 : // 1 hour
    true;

  return (
    <div className="flex items-center gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isStale ? "secondary" : "outline"} 
                className="flex items-center gap-1.5"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : isStale ? (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <span>Last sync: {syncAge}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    <span>Synced {syncAge}</span>
                  </>
                )}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">Sync Status</p>
              {bankAccounts.map(account => (
                <p key={account.id} className="text-xs">
                  {account.name}: {getTimeSinceSync(account.lastSync)}
                </p>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Transactions sync automatically when you visit this page
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isSyncing}
        className="h-8"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}