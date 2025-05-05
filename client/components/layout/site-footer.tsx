import Link from "next/link";
import { Package2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="w-full border-t py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4 md:w-1/3">
            <Link href="/" className="flex items-center gap-2">
              <Package2 className="h-6 w-6" />
              <span className="font-bold text-xl">SoleLedger</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Simplifying accounting for small businesses and sole proprietors.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:w-2/3">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Product</h4>
              <ul className="space-y-2 text-sm">
                {["Features", "Pricing", "Integrations", "FAQ"].map(
                  (item, i) => (
                    <li key={i}>
                      <Link
                        href={
                          item === "Pricing"
                            ? "/pricing"
                            : `/#${item.toLowerCase()}`
                        }
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Company</h4>
              <ul className="space-y-2 text-sm">
                {["About", "Blog", "Careers", "Contact"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href={`/${item.toLowerCase()}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Legal</h4>
              <ul className="space-y-2 text-sm">
                {["Terms", "Privacy", "Cookies", "Licenses"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href={`/${item.toLowerCase()}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-8">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SoleLedger. All rights reserved.
          </p>
          <div className="flex gap-4">
            {["Twitter", "LinkedIn", "GitHub", "YouTube"].map((social, i) => (
              <Link
                key={i}
                href="#"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
