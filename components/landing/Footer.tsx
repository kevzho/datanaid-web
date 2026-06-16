import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Separator } from "@/components/ui/separator";

const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { label: "Upload Data", href: "/upload" },
      { label: "Features", href: "/#features" },
      { label: "How it Works", href: "/#workflow" },
      { label: "Use Cases", href: "/#use-cases" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Sample Data", href: "/upload" },
      { label: "Impact Report Example", href: "/upload" },
      { label: "Data Quality Guide", href: "/upload" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/" },
      { label: "Privacy Policy", href: "/" },
      { label: "Terms of Service", href: "/" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              Turn nonprofit data into impact. Free for mission-driven organizations.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
                {heading}
              </p>
              <ul className="space-y-2.5" role="list">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p>© 2026 Datanaid. Turn nonprofit data into impact.</p>
          <p className="text-xs">
            Built for organizations that change communities.
          </p>
        </div>
      </div>
    </footer>
  );
}
