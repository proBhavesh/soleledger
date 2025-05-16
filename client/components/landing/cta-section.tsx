import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
		<section className="w-full py-16 md:pb-20">
			<div className="px-4 md:px-6">
				<div className="flex flex-col items-center justify-center">
					<div className="mx-auto w-full rounded-lg p-2 text-primary-foreground text-center relative overflow-hidden backdrop-blur-sm border border-white/30 shadow-lg group">
						{/* Gradient background elements */}
						<div className="absolute inset-0 z-0 transition-all duration-500">
							<div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMjAwdjIwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-20"></div>
							<div className="absolute -top-24 -left-24 w-64 h-64 bg-[#8b9cff]/20 rounded-full filter blur-3xl group-hover:bg-[#8b9cff]/30 group-hover:translate-x-3 group-hover:-translate-y-3 transition-all duration-700"></div>
							<div className="absolute -bottom-32 -right-16 w-80 h-80 bg-[#6366f1]/30 rounded-full filter blur-3xl group-hover:bg-[#6366f1]/40 group-hover:-translate-x-3 group-hover:translate-y-3 transition-all duration-700"></div>
							<div className="absolute top-1/2 right-1/4 w-64 h-64 bg-[#312e81]/20 rounded-full filter blur-3xl group-hover:bg-[#312e81]/30 group-hover:translate-x-2 group-hover:-translate-y-2 transition-all duration-700"></div>
						</div>

						{/* Content */}
						<div
							className="relative z-10 p-8 py-24 rounded-md border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10"
							style={{
								background:
									"linear-gradient(135deg, rgba(99, 102, 241, 0.85), rgba(49, 46, 129, 0.75))",
							}}
						>
							<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
								Ready to simplify your bookkeeping?
							</h2>
							<p className="mt-4 text-primary-foreground/90 md:text-lg max-w-xl mx-auto">
								Join thousands of businesses saving time and
								money with SoleLedger. Start your free 30-day
								trial today.
							</p>
							<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
								<Link href="/register">
									<Button
										size="lg"
										variant="secondary"
										className="h-12 px-8 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
									>
										Get Started Free
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</Link>
								<Link href="/pricing">
									<Button
										variant="outline"
										size="lg"
										className="h-12 px-8 bg-transparent text-primary-foreground border-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
									>
										View Pricing
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
  );
}
