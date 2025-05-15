"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface Client {
  name: string;
  status: "Complete" | "Needs Review" | "Attention Needed";
  lastUpdated: string;
  pendingTransactions: number;
}

interface ClientOverviewProps {
  clients: Client[];
}

export function ClientOverview({ clients }: ClientOverviewProps) {
  // Helper function to get status styling
  const getStatusStyles = (status: Client["status"]) => {
    switch (status) {
      case "Complete":
        return "bg-emerald-100 text-emerald-700";
      case "Needs Review":
        return "bg-amber-100 text-amber-700";
      case "Attention Needed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Overview</CardTitle>
        <CardDescription>Status of your client accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clients.map((client, index) => (
            <div key={`${client.name}-${index}`} className="rounded-md border">
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-center">
                  <span className="text-sm font-medium">{client.name}</span>
                  <span
                    className={`ml-auto text-xs px-2 py-1 rounded-full ${getStatusStyles(
                      client.status
                    )}`}
                  >
                    {client.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>Last updated: {client.lastUpdated}</span>
                  <span className="mx-2">•</span>
                  <span>{client.pendingTransactions} transactions pending</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
