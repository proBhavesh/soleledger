import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="w-full py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-8 md:p-12 text-primary-foreground text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to simplify your bookkeeping?
          </h2>
          <p className="mt-4 text-primary-foreground/90 md:text-lg">
            Join thousands of businesses saving time and money with SoleLedger.
            Start your free 30-day trial today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="h-12 px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
