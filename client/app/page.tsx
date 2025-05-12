import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { CTASection } from "@/components/landing/cta-section";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />

        {/* Logos Section */}
        <section className="w-full py-12 md:py-16 border-y bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Trusted by businesses and accountants worldwide
              </p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12 grayscale opacity-70">
                {[
                  "Company 1",
                  "Company 2",
                  "Company 3",
                  "Company 4",
                  "Company 5",
                ].map((company, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <span className="text-lg font-semibold">{company}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FeaturesSection />

        {/* Testimonial Section */}
        <section className="w-full py-16 md:py-24 bg-primary/5">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <span className="text-lg font-bold text-primary-foreground">
                  &quot;
                </span>
              </div>
              <blockquote className="mx-auto max-w-3xl text-xl font-medium italic md:text-2xl">
                SoleLedger has transformed how I manage my business finances.
                I&apos;ve saved hours each week on bookkeeping and have complete
                visibility into my cash flow.
              </blockquote>
              <div className="mt-4">
                <div className="font-semibold">Sarah Johnson</div>
                <div className="text-sm text-muted-foreground">
                  Small Business Owner
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                How SoleLedger Works
              </h2>
              <p className="text-muted-foreground">
                Get started in minutes with an automated bookkeeping system that
                grows with your business
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Connect Your Accounts",
                  description:
                    "Securely link your bank accounts and credit cards to automatically import transactions.",
                },
                {
                  step: "02",
                  title: "Upload Receipts",
                  description:
                    "Snap photos of receipts or upload digital copies — AI automatically categorizes them.",
                },
                {
                  step: "03",
                  title: "Generate Reports",
                  description:
                    "Get instant financial reports and insights to make informed business decisions.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group relative flex flex-col items-start"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-medium">{item.title}</h3>
                  <p className="mt-2 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
}
