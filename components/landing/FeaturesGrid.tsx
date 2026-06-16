import {
  Upload,
  ShieldCheck,
  TrendingUp,
  FileText,
  BarChart3,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Upload,
    title: "Instant Data Upload",
    description:
      "Drop in a CSV or Excel file and Datanaid parses it immediately — column types, date ranges, and row counts detected automatically. No reformatting required.",
  },
  {
    icon: ShieldCheck,
    title: "Data Quality Scoring",
    description:
      "Every upload gets a quality score from 0–100 with a letter grade. Missing values, duplicates, type conflicts, and outliers are flagged before analysis begins.",
  },
  {
    icon: TrendingUp,
    title: "Trend Detection",
    description:
      "Datanaid identifies time-series patterns across your metrics — monthly growth rates, rolling averages, seasonal dips, and year-over-year comparisons — automatically.",
  },
  {
    icon: FileText,
    title: "Impact Reporting",
    description:
      "Generate a polished, export-ready report in Markdown or PDF. Structured for grant applications: executive summary, key findings, data quality notes, and recommended actions.",
  },
  {
    icon: BarChart3,
    title: "Plain-Language Visualizations",
    description:
      "Every chart includes a plain-English explanation of what it shows, why it matters to your mission, and one concrete action step — not just a chart your board will ignore.",
  },
  {
    icon: Sparkles,
    title: "AI Insights — Zero Hallucinations",
    description:
      "Every insight is grounded strictly in your data. Datanaid shows you the exact evidence behind each finding. No invented statistics, no fabricated trends — just your numbers, clearly explained.",
  },
] as const;

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Features
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Everything your data needs. Nothing it doesn&apos;t.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Six capabilities, working together — from raw file to funder-ready
            story in under a minute.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-6 hover-elevate"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-2">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
