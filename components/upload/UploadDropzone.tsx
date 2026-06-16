"use client";

import * as React from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, isAcceptedFile } from "@/lib/analytics/ingestion";

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onFile, disabled }: UploadDropzoneProps) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl transition-transform",
          dragging ? "scale-110 bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
        )}
      >
        <UploadCloud className="h-8 w-8" />
      </div>

      <h3 className="mt-5 font-display text-xl font-semibold">
        {dragging ? "Drop to upload" : "Drag & drop your dataset"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        or <span className="font-medium text-primary">browse your files</span>. We&apos;ll parse it
        instantly in your browser — your data never leaves your device until you analyze.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {ACCEPTED_EXTENSIONS.join(", ")}
        </span>
        <span className="rounded-full border border-border bg-background px-3 py-1">
          Up to {MAX_FILE_BYTES / 1024 / 1024} MB
        </span>
      </div>
    </div>
  );
}

export { isAcceptedFile };
