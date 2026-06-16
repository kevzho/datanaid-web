"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAnalysis } from "@/lib/store/analysis-store";

interface TopbarProps {
  title: string;
  description?: string;
  onMenu: () => void;
  actions?: React.ReactNode;
}

export function Topbar({ title, description, onMenu, actions }: TopbarProps) {
  const { result, reset } = useAnalysis();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-md p-2 text-muted-foreground hover-elevate lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {result && (
          <Button variant="ghost" size="sm" onClick={reset} className="hidden sm:inline-flex">
            <RotateCcw className="h-4 w-4" />
            New analysis
          </Button>
        )}
        <Button variant="ghost" size="icon" asChild aria-label="Home">
          <Link href="/">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
