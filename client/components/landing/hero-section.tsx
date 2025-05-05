import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="w-full py-16 md:py-24 lg:py-32 xl:py-40 overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
            <span className="text-primary">New</span>
            <span className="mx-2">•</span>
            <span>Receipt management with AI categorization</span>
            <ChevronRight className="ml-1 h-4 w-4" />
          </div>
          <div className="space-y-4 max-w-[800px]">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="text-primary">Automate</span> Your Bookkeeping
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl">
              SoleLedger simplifies accounting for small businesses with
              automation that saves you time, reduces errors, and gives you
              clarity on your finances.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 rounded-full">
                Start For Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 rounded-full"
              >
                See How It Works
              </Button>
            </Link>
          </div>
          <div className="mt-6 relative w-full max-w-5xl aspect-video rounded-lg border bg-muted/40 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <span className="font-medium">Dashboard Preview</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
