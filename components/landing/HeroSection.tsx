"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";

/* ─── Faux dashboard mockup ─── */
function MockupDashboard() {
  // Mini area chart data points — donations over 8 months
  const data = [62, 71, 68, 84, 90, 104, 118, 131];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const W = 280;
  const H = 72;
  const pad = 6;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    return `${x},${y}`;
  });
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `M ${pad},${H - pad} L ${pts.join(" L ")} L ${W - pad},${H - pad} Z`;

  return (
    <div className="relative mx-auto max-w-[580px] animate-fade-up [animation-delay:200ms] [animation-fill-mode:both]">
      {/* Soft emerald glow behind card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 rounded-3xl opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, hsl(161 84% 40% / 0.4) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <div className="mx-auto flex h-5 w-48 items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground">
            datanaid.app · Annual Impact Report
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <KPICard
              label="Total Donations"
              value="$248K"
              delta="+18%"
              positive
            />
            <KPICard label="Clients Served" value="3,412" delta="+12%" positive />
            <KPICard label="Data Quality" value="92/100" delta="A" positive />
          </div>

          {/* Mini chart */}
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Monthly Donations
              </span>
              <span className="text-[10px] text-muted-foreground">
                Jan – Aug 2024
              </span>
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height={H}
              aria-hidden="true"
              className="overflow-visible"
            >
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(161 84% 34%)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="hsl(161 84% 34%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1={pad}
                  x2={W - pad}
                  y1={pad + (i / 3) * (H - pad * 2)}
                  y2={pad + (i / 3) * (H - pad * 2)}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
              ))}
              {/* Area fill */}
              <path d={areaPath} fill="url(#emeraldGrad)" />
              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke="hsl(161 84% 34%)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Last dot */}
              <circle
                cx={W - pad}
                cy={H - pad - ((data[data.length - 1] - min) / (max - min)) * (H - pad * 2)}
                r="3.5"
                fill="hsl(161 84% 34%)"
              />
            </svg>
          </div>

          {/* Insight chip */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs font-medium text-foreground">
              <span className="text-primary">Donations up 18%</span> — sustain Q4 momentum with your top 3 recurring donors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      <p className="mt-0.5 font-display text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <span
        className={`inline-block text-[10px] font-medium ${positive ? "text-success" : "text-destructive"}`}
      >
        {delta}
      </span>
    </div>
  );
}

/* ─── Hero section ─── */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Background radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, hsl(161 84% 40% / 0.12) 0%, transparent 70%)",
        }}
      />

      <div className="container relative">
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:gap-12">
          {/* Copy */}
          <div className="flex-1 text-center lg:text-left animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">
                Free for nonprofits · No data team required
              </span>
            </div>

            <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight text-balance sm:text-6xl">
              Turn nonprofit data{" "}
              <span className="text-primary">into impact.</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty max-w-xl mx-auto lg:mx-0">
              Datanaid transforms your messy spreadsheets into grounded insights,
              time-series trends, forecasts, and a funder-ready impact report —
              all in minutes. No data team, no code, no guesswork.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <Button asChild size="lg" className="gap-2 w-full sm:w-auto">
                <Link href="/upload">
                  Start Free Analysis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Link href="/upload">View Demo</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No account needed · Works with CSV & Excel · Results in under 60 seconds
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="flex-1 w-full">
            <MockupDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}
