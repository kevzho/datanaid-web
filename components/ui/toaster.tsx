"use client"

import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import { ToastItem } from "@/components/ui/toast"

/**
 * Self-contained Toaster component.
 * Mount once in your root layout: <Toaster />
 * Then call toast({ title, description, variant }) from anywhere.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          variant={t.variant}
          title={t.title}
          description={t.description}
          onDismiss={() => dismiss(t.id)}
        />
      ))}
    </div>
  )
}
