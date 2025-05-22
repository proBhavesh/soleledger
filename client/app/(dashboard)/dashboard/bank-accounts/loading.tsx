import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BankAccountsLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="w-full">
        <div className="flex space-x-1 mb-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Overview tab content skeleton */}
        <div className="mt-4 space-y-6">
          {/* Bank accounts summary skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="cursor-pointer hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-7 w-28" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Account balance chart skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-28" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Recent activity skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>

              {/* Transaction filters skeleton */}
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Transactions table skeleton */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-24" />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
