"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Upload,
  Microscope,
  ScatterChart,
  BarChart3,
  Lightbulb,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useAnalysis } from "@/lib/store/analysis-store";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/upload", label: "Upload", icon: Upload, step: 1 },
  { href: "/profile", label: "Data Profile", icon: ScatterChart, step: 2 },
  { href: "/analysis", label: "Analysis", icon: Microscope, step: 3 },
  { href: "/visualizations", label: "Visualizations", icon: BarChart3, step: 4 },
  { href: "/insights", label: "Insights", icon: Lightbulb, step: 5 },
  { href: "/report", label: "Impact Report", icon: FileText, step: 6 },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { result } = useAnalysis();
  const hasData = !!result;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/" onClick={onNavigate} className="rounded-md">
          <Logo />
        </Link>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="rounded-md p-1.5 text-muted-foreground hover-elevate lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const locked = !hasData && item.step > 1;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover-elevate active-elevate-2",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
                locked && "opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {item.step}
              </span>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        {hasData ? (
          <div className="rounded-lg bg-muted/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Active dataset</span>
              <Badge variant="success" className="text-[10px]">Ready</Badge>
            </div>
            <p className="mt-1 truncate text-sm font-medium" title={result?.fileName}>
              {result?.fileName}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {result?.rowCount.toLocaleString()} rows · {result?.columnCount} cols
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">No dataset loaded</p>
            <Link href="/upload" onClick={onNavigate} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
              Upload to begin →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
