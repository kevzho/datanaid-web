/**
 * Client-side PDF export via the browser print pipeline.
 *
 * Rather than bundling a heavy PDF library, Datanaid renders a print-optimized
 * version of the Impact Report (see app/(app)/report) and triggers the native
 * print dialog, where the user can "Save as PDF". This produces crisp, vector
 * text and respects the app's typography. The report view applies a dedicated
 * print stylesheet so the exported document is clean (no nav, no shell).
 */

export function printReport(): void {
  if (typeof window === "undefined") return;
  window.print();
}
