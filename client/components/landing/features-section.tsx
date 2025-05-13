import {
  Database,
  FileText,
  Receipt,
  Shield,
  Clock,
  LucideIcon,
} from "lucide-react";

interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function FeaturesSection() {
  const features: FeatureItem[] = [
    {
      title: "Automated Data Collection",
      description:
        "Connect bank accounts or upload statements to automatically fetch and categorize transactions.",
      icon: Database,
    },
    {
      title: "Receipt & Invoice Management",
      description:
        "Upload and match receipts or invoices easily—no more searching for paperwork during tax season.",
      icon: Receipt,
    },
    {
      title: "Instant, Accurate Reporting",
      description:
        "Generate clear, actionable reports (P&L, Balance Sheet, Cash Flow) instantly.",
      icon: FileText,
    },
    {
      title: "Collaboration & Permissions",
      description:
        "Invite team members or external accountants with fine-grained role permissions.",
      icon: Shield,
    },
    {
      title: "Data Security & Compliance",
      description:
        "Built-in encryption and compliance with financial/data privacy regulations.",
      icon: Shield,
    },
    {
      title: "Reminders and Insights",
      description:
        "Smart automated alerts for deadlines or anomalies in finances.",
      icon: Clock,
    },
  ];

  return (
		<section
			className="w-full py-20 md:py-28 bg-gradient-to-b from-background to-muted/30"
			id="features"
		>
			<div className="px-4 md:px-6">
				<div className="flex flex-col items-center justify-center space-y-3 text-center">
					<div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
						Features
					</div>
					<div className="space-y-4 max-w-[800px]">
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl/tight lg:text-5xl">
							Everything you need to manage your finances
						</h2>
						<p className="mx-auto max-w-[700px] text-muted-foreground text-lg leading-relaxed">
							SoleLedger transforms bookkeeping from a tedious,
							manual chore into a streamlined, automated process.
						</p>
					</div>
				</div>

				<div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 mt-16">
					{features.map((feature, index) => {
						const Icon = feature.icon;
						return (
							<div
								key={index}
								className="group flex flex-col gap-4 rounded-xl border bg-background p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:translate-y-[-2px]"
							>
								<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors duration-200">
									<Icon className="h-6 w-6 text-primary" />
								</div>
								<h3 className="text-xl font-semibold">
									{feature.title}
								</h3>
								<p className="text-muted-foreground leading-relaxed">
									{feature.description}
								</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
  );
}
