import * as React from "react";
import type { KPI } from "@/types/dataset";
import { MetricCard } from "./MetricCard";

interface KPISectionProps {
  kpis: KPI[];
}

export function KPISection({ kpis }: KPISectionProps) {
  const displayKpis = kpis.slice(0, 6);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
      {displayKpis.map((kpi, i) => (
        <MetricCard key={`${kpi.label}-${i}`} kpi={kpi} />
      ))}
    </div>
  );
}
