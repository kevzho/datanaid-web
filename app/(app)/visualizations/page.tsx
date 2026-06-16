"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageSection } from "@/components/shared/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { TrendChartCard } from "@/components/charts/TrendChart";
import { CategoryChartCard } from "@/components/charts/CategoryChart";
import { DistributionChartCard } from "@/components/charts/DistributionChart";
import {
  HeatmapChartCard,
  computeCorrelation,
} from "@/components/charts/HeatmapChart";
import { ForecastChartCard } from "@/components/charts/ForecastChart";
import { useAnalysis } from "@/lib/store/analysis-store";

function SectionEmpty({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export default function VisualizationsPage() {
  const { result, dataset } = useAnalysis();

  const correlation = React.useMemo(() => {
    if (!result || !dataset) return null;
    const cols = result.profile.numericColumns;
    if (cols.length < 2) return null;
    return computeCorrelation(dataset.rows, cols);
  }, [result, dataset]);

  if (!result) {
    return (
      <DashboardShell
        title="Visualizations"
        description="Trends, breakdowns, distributions, correlations, and forecasts."
      >
        <EmptyState
          icon={BarChart3}
          title="No charts to show yet"
          description="Upload a dataset and Datanaid will build trend, category, distribution, and forecast charts — each with a plain-language interpretation."
          actionLabel="Upload a dataset"
          actionHref="/upload"
        />
      </DashboardShell>
    );
  }

  const numericProfiles = result.profile.columns.filter((c) => c.numeric).slice(0, 4);

  return (
    <DashboardShell
      title="Visualizations"
      description={`Visual story of ${result.fileName} — every chart explains what it means and what to do.`}
    >
      <div className="space-y-8">
        {/* Trends */}
        <PageSection
          title="Trends over time"
          description="How your key metrics move across the date range."
        >
          {result.trends.length === 0 ? (
            <SectionEmpty message="No date column detected, so trends over time aren't available." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {result.trends.map((trend) => (
                <TrendChartCard key={`${trend.metric}-${trend.dateColumn}`} trend={trend} />
              ))}
            </div>
          )}
        </PageSection>

        {/* Category breakdowns */}
        <PageSection
          title="Category breakdowns"
          description="Where value concentrates across programs, locations, and funders."
        >
          {result.categories.length === 0 ? (
            <SectionEmpty message="No categorical dimensions available to break down." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {result.categories.map((breakdown) => (
                <CategoryChartCard
                  key={`${breakdown.dimension}-${breakdown.metric ?? "count"}`}
                  breakdown={breakdown}
                />
              ))}
            </div>
          )}
        </PageSection>

        {/* Distributions */}
        {numericProfiles.length > 0 && (
          <PageSection
            title="Distributions"
            description="The shape and spread of your numeric columns."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {numericProfiles.map((col) => (
                <DistributionChartCard key={col.name} column={col} />
              ))}
            </div>
          </PageSection>
        )}

        {/* Correlation */}
        {correlation && (
          <PageSection
            title="Correlations"
            description="Which numeric metrics move together."
          >
            <HeatmapChartCard correlation={correlation} />
          </PageSection>
        )}

        {/* Forecasts */}
        {result.forecasts.length > 0 && (
          <PageSection
            title="Forecasts"
            description="Projected trajectory with confidence intervals."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {result.forecasts.map((forecast) => (
                <ForecastChartCard
                  key={`${forecast.metric}-${forecast.dateColumn}`}
                  forecast={forecast}
                />
              ))}
            </div>
          </PageSection>
        )}
      </div>
    </DashboardShell>
  );
}
