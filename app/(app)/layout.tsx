import { AnalysisProvider } from "@/lib/store/analysis-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AnalysisProvider>{children}</AnalysisProvider>;
}
