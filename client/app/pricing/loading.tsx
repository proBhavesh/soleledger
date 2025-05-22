import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PricingLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="text-center py-12 px-4">
        <Skeleton className="h-12 w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-[600px] mx-auto mb-2" />
        <Skeleton className="h-6 w-[500px] mx-auto" />
      </div>

      {/* Pricing toggle skeleton */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      {/* Pricing cards skeleton */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid gap-8 lg:grid-cols-3">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card
                key={i}
                className={`relative ${
                  i === 1 ? "border-primary shadow-lg scale-105" : ""
                }`}
              >
                {i === 1 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-32 mx-auto" />
                    <Skeleton className="h-5 w-48 mx-auto" />
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-12 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-4 w-32 mx-auto mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Features list skeleton */}
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-20" />
                    <div className="space-y-3">
                      {Array(i === 1 ? 8 : 5)
                        .fill(0)
                        .map((_, featureIndex) => (
                          <div
                            key={featureIndex}
                            className="flex items-center gap-3"
                          >
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* CTA button skeleton */}
                  <div className="pt-6">
                    <Skeleton className="h-12 w-full" />
                  </div>

                  {/* Additional features skeleton */}
                  {i === 1 && (
                    <div className="space-y-4 pt-4 border-t">
                      <Skeleton className="h-5 w-28" />
                      <div className="space-y-3">
                        {Array(4)
                          .fill(0)
                          .map((_, extraIndex) => (
                            <div
                              key={extraIndex}
                              className="flex items-center gap-3"
                            >
                              <Skeleton className="h-4 w-4 rounded-full" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>

        {/* FAQ skeleton */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-80 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-5" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
          </div>
        </div>

        {/* Bottom CTA skeleton */}
        <div className="text-center mt-20 py-12 border-t">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-5 w-80 mx-auto mb-8" />
          <div className="flex items-center justify-center gap-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-28" />
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8">
        <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
