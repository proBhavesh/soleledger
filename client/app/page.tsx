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
				<section className="w-full py-12 border-y bg-muted/20">
					<div className="px-4 md:px-6">
						<div className="flex flex-col items-center gap-6">
							<p className="text-sm font-medium text-muted-foreground text-center">
								Trusted by businesses and accountants worldwide
							</p>
							<div className="flex flex-wrap justify-center gap-10 md:gap-16 grayscale opacity-60 hover:opacity-80 transition-opacity duration-300">
								{[
									"Company 1",
									"Company 2",
									"Company 3",
									"Company 4",
									"Company 5",
								].map((company, i) => (
									<div
										key={i}
										className="flex items-center justify-center"
									>
										<span className="text-lg font-semibold">
											{company}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>

				<FeaturesSection />

				{/* Testimonial Section */}
				<section className="w-full py-24 md:py-32 bg-gradient-to-b from-primary/10 via-transparent to-primary/10">
					<div className="px-4 md:px-6 max-w-6xl mx-auto">
						<div className="flex flex-col items-center space-y-8">
							<div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 shadow-md transition-all duration-200 hover:bg-primary/15">
								<span className="text-3xl font-bold text-primary">
									&quot;
								</span>
							</div>
							<blockquote className="mx-auto max-w-3xl text-xl md:text-2xl font-medium leading-relaxed text-center">
								SoleLedger has transformed how I manage my
								business finances. I&apos;ve saved hours each
								week on bookkeeping and have complete visibility
								into my cash flow.
							</blockquote>
							<div className="flex flex-col items-center mt-4">
								<div className="font-semibold text-lg">
									Sarah Johnson
								</div>
								<div className="text-sm text-muted-foreground">
									Small Business Owner
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* How It Works Section */}
				<section className="w-full py-20 md:py-28 bg-gradient-to-b from-background to-muted/30">
					<div className="px-4 md:px-6">
						<div className="mx-auto max-w-2xl space-y-4 text-center mb-16">
							<div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
								Simple Process
							</div>
							<h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
								How SoleLedger Works
							</h2>
							<p className="text-lg text-muted-foreground max-w-xl mx-auto">
								Get started in minutes with an automated
								bookkeeping system that grows with your business
							</p>
						</div>

						<div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3 relative">
							{/* Connecting line for desktop */}
							<div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

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
									className="group relative flex flex-col items-center text-center p-8 rounded-xl border bg-background shadow-sm hover:shadow-md hover:border-primary/20 hover:translate-y-[-2px] transition-all duration-200"
								>
									<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-bold text-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200 shadow-sm">
										{item.step}
									</div>
									<h3 className="text-xl font-semibold mb-3">
										{item.title}
									</h3>
									<p className="text-muted-foreground leading-relaxed">
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
