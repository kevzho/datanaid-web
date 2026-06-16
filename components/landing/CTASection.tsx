import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <div
          className="relative overflow-hidden rounded-2xl px-8 py-16 text-center sm:px-16"
          style={{
            background:
              "linear-gradient(135deg, hsl(161 84% 24%) 0%, hsl(161 84% 32%) 50%, hsl(175 70% 28%) 100%)",
          }}
        >
          {/* Subtle pattern overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, hsl(0 0% 100% / 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(0 0% 100% / 0.1) 0%, transparent 50%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, hsl(0 0% 100% / 0.04) 1px, transparent 1px), linear-gradient(to bottom, hsl(0 0% 100% / 0.04) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl text-white">
              From spreadsheets to stories —{" "}
              <span className="opacity-90">in minutes.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              Upload your nonprofit&apos;s data today and get a funder-ready
              impact report with zero setup, zero code, and zero cost.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="gap-2 bg-white text-primary font-semibold w-full sm:w-auto"
              >
                <Link href="/upload">
                  Start Free Analysis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-white/60">
              No account required · Works with CSV &amp; Excel · Free forever for nonprofits
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
