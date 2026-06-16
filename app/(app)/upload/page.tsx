"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Sparkles, ShieldCheck, Database } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { UploadProgress, type UploadStage } from "@/components/upload/UploadProgress";
import { FilePreview } from "@/components/upload/FilePreview";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalysis } from "@/lib/store/analysis-store";
import { ingestFile } from "@/lib/analytics/ingestion";
import { useToast } from "@/hooks/use-toast";

const TRUST = [
  { icon: ShieldCheck, title: "Grounded insights", text: "Every number traces back to your data. No invented statistics." },
  { icon: Sparkles, title: "Instant analysis", text: "Profiling, trends, forecasts, and a report in seconds." },
  { icon: Database, title: "CSV & Excel", text: "Drop a spreadsheet — we infer types and detect nonprofit metrics." },
];

export default function UploadPage() {
  const router = useRouter();
  const { setDataset, analyze, dataset, warnings, status, error } = useAnalysis();
  const { toast } = useToast();
  const [stage, setStage] = React.useState<UploadStage | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);
    setStage("parsing");
    const res = await ingestFile(file);
    if (!res.ok || !res.dataset) {
      setStage(null);
      setLocalError(res.error ?? "Could not read that file.");
      toast({ title: "Upload failed", description: res.error, variant: "destructive" });
      return;
    }
    setDataset(res.dataset, res.warnings);
    setStage("analyzing");
    await analyze(true);
    setStage("done");
    toast({ title: "Analysis ready", description: `${res.dataset.fileName} analyzed.`, variant: "success" });
    router.push("/profile");
  };

  const loadSample = async () => {
    setLocalError(null);
    setStage("parsing");
    try {
      const resp = await fetch("/sample-nonprofit-data.csv");
      const blob = await resp.blob();
      const file = new File([blob], "sample-nonprofit-data.csv", { type: "text/csv" });
      await handleFile(file);
    } catch {
      setStage(null);
      setLocalError("Could not load the sample dataset.");
    }
  };

  const busy = stage === "parsing" || stage === "analyzing" || status === "analyzing";

  return (
    <DashboardShell
      title="Upload your dataset"
      description="Start by dropping a CSV or Excel file. We'll handle the rest."
    >
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {busy && stage ? (
            <UploadProgress stage={stage} fileName={dataset?.fileName ?? "your file"} />
          ) : (
            <UploadDropzone onFile={handleFile} disabled={busy} />
          )}

          {(localError || error) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{localError ?? error}</AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && !busy && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>
                <ul className="list-inside list-disc space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {dataset && !busy && <FilePreview dataset={dataset} />}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={loadSample} disabled={busy}>
              <Database className="h-4 w-4" />
              Try with sample nonprofit data
            </Button>
            <span className="text-xs text-muted-foreground">
              No file handy? Explore Datanaid with a realistic example.
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.title}>
                <CardContent className="flex gap-3 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.text}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
