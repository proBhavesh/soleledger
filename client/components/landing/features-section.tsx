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
    <section className="w-full py-16 md:py-24 lg:py-32" id="features">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
            Features
          </div>
          <div className="space-y-2 max-w-[800px]">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Everything you need to manage your finances
            </h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg">
              SoleLedger transforms bookkeeping from a tedious, manual chore
              into a streamlined, automated process.
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 mt-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-xl border p-6 transition-colors hover:border-primary/20 hover:bg-muted/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
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
