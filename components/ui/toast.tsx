"use client"

// Lightweight toast primitives — no @radix-ui/react-toast dependency.
// Backed by hooks/use-toast.ts global store.

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { type Toast } from "@/hooks/use-toast"

export const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-lg border bg-card p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border-border text-card-foreground",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground",
        success:
          "border-success/30 bg-success/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  onDismiss?: () => void
  title?: string
  description?: string
}

export function ToastItem({
  className,
  variant,
  title,
  description,
  onDismiss,
  ...props
}: ToastProps) {
  return (
    <div
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className="flex-1 space-y-1">
        {title && (
          <p className="text-sm font-semibold leading-none">{title}</p>
        )}
        {description && (
          <p className="text-sm opacity-90">{description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  )
}

// Re-export Toast type for convenience
export type { Toast }
