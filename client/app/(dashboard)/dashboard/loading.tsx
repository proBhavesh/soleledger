import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Welcome banner skeleton */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-56 mb-1" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex space-x-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-16" />
        </div>

        {/* Financial metrics skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Charts and main content skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Cash flow chart skeleton */}
          <Card className="col-span-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] flex items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Bank accounts summary skeleton */}
          <Card className="col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income vs Expenses chart skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40 mb-1" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
