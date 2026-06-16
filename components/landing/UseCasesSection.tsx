import { ShoppingBag, GraduationCap, Heart, Users, Star } from "lucide-react";

const USE_CASES = [
  {
    icon: ShoppingBag,
    org: "Food Banks",
    insight:
      "See which programs serve the most families per dollar — and make the case to funders with real numbers.",
  },
  {
    icon: GraduationCap,
    org: "Education Nonprofits",
    insight:
      "Track student outcome trends across cohorts and show year-over-year improvement in a single, shareable report.",
  },
  {
    icon: Heart,
    org: "Animal Shelters",
    insight:
      "Identify your highest-adoption months and align fundraising campaigns with the data that moves donors.",
  },
  {
    icon: Users,
    org: "Community Orgs",
    insight:
      "Break down service delivery by program and geography to find gaps — and the evidence to fill them.",
  },
  {
    icon: Star,
    org: "Youth Programs",
    insight:
      "Surface attendance trends and session completion rates that prove program effectiveness to school-district partners.",
  },
] as const;

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Use Cases
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Built for organizations like yours.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Datanaid works with any structured program data — wherever your
            mission operates.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {USE_CASES.map(({ icon: Icon, org, insight }) => (
            <div
              key={org}
              className="rounded-xl border border-border bg-card p-6 hover-elevate flex flex-col gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground mb-1">
                  {org}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insight}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
