import { Upload, ScanSearch, Wand2, Download } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Upload,
    title: "Upload",
    description: "Drop your CSV or Excel file. Datanaid parses it instantly — no reformatting, no templates.",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "Analyze",
    description: "Quality scores, trend detection, outliers, and category breakdowns run automatically in seconds.",
  },
  {
    number: "03",
    icon: Wand2,
    title: "Generate",
    description: "AI insights grounded in your data surface the findings that matter most to funders and boards.",
  },
  {
    number: "04",
    icon: Download,
    title: "Export",
    description: "Download a polished impact report in PDF or Markdown, ready to attach to your next grant application.",
  },
] as const;

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-20 sm:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            How it works
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            From file upload to impact report in four steps.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            No configuration. No training. Just your data and a report you can share.
          </p>
        </div>

        {/* Steps row */}
        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connector line — desktop only */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-10 left-[12.5%] right-[12.5%] hidden h-px lg:block"
            style={{
              background:
                "linear-gradient(to right, transparent, hsl(var(--border)), hsl(var(--primary)) 50%, hsl(var(--border)), transparent)",
            }}
          />

          {STEPS.map(({ number, icon: Icon, title, description }) => (
            <div key={number} className="relative flex flex-col items-center text-center lg:items-center">
              {/* Number badge with icon */}
              <div className="relative mb-5 flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-border bg-card shadow-sm z-10">
                <Icon className="h-6 w-6 text-primary" />
                <span className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground">
                  {number}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
