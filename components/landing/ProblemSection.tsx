import { FileSpreadsheet, Clock, FileWarning, BarChart2 } from "lucide-react";

const PAIN_POINTS = [
  {
    icon: FileSpreadsheet,
    title: "Data trapped in spreadsheets",
    description:
      "Years of program data sits in folders no one opens — too tangled to query, too scattered to summarize.",
  },
  {
    icon: Clock,
    title: "No time for analysis",
    description:
      "Nonprofits run lean. Your team is serving clients, not running pivot tables. Analysis keeps getting pushed to next quarter.",
  },
  {
    icon: FileWarning,
    title: "Reports take days",
    description:
      "Pulling together a funder narrative means hours stitching numbers from six spreadsheets, then triple-checking the math.",
  },
  {
    icon: BarChart2,
    title: "Insights you can't trust",
    description:
      "One-off charts and gut-feel summaries don't hold up under funder scrutiny. You need numbers grounded in your actual data.",
  },
] as const;

export function ProblemSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        {/* Editorial framing */}
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            The Problem
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            You&apos;re sitting on impact. You just can&apos;t see it yet.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Nonprofits collect mountains of program data. Rarely does any of it
            become the compelling evidence funders need to say yes.
          </p>
        </div>

        {/* Pain point grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PAIN_POINTS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 hover-elevate"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/8 text-destructive">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-1.5">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>

        {/* Bridge line */}
        <p className="mt-12 text-center text-base font-medium text-muted-foreground">
          Datanaid was built to close exactly this gap —
          <span className="text-foreground"> no analyst required.</span>
        </p>
      </div>
    </section>
  );
}
