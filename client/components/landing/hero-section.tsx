import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
		<section className="w-full py-20 overflow-hidden relative">
			{/* Background gradient */}
			<div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />

			<div className="px-4 md:px-6">
				<div className="flex flex-col items-center gap-10 text-center">
					<div className="inline-flex items-center rounded-full border bg-background/50 backdrop-blur-sm px-4 py-1.5 text-sm shadow-sm hover:shadow-md transition-all duration-200">
						<span className="text-primary font-medium">New</span>
						<span className="mx-2 text-muted-foreground">•</span>
						<span className="text-muted-foreground">
							Receipt management with AI categorization
						</span>
						<ChevronRight className="ml-1 h-4 w-4 text-muted-foreground" />
					</div>

					<div className="space-y-6 max-w-[800px]">
						<h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
							<span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary/80">
								Automate
							</span>{" "}
							Your Bookkeeping
						</h1>
						<p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl leading-relaxed">
							SoleLedger simplifies accounting for small
							businesses with automation that saves you time,
							reduces errors, and gives you clarity on your
							finances.
						</p>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-4">
						<Link href="/register">
							<Button
								size="lg"
								className="h-12 px-8 rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
							>
								Start For Free
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</Link>
						<Link href="#features">
							<Button
								variant="outline"
								size="lg"
								className="h-12 px-8 rounded-full hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
							>
								See How It Works
							</Button>
						</Link>
					</div>

					<div className="mt-8 relative w-full max-w-5xl aspect-video rounded-xl border bg-muted/40 overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300">
						<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
							<span className="font-medium text-lg">
								Dashboard Preview
							</span>
						</div>
						{/* Decorative elements */}
						<div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
						<div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-full translate-x-1/2 translate-y-1/2" />
					</div>
				</div>
			</div>
		</section>
  );
}
