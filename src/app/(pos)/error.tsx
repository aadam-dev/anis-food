"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "@/components/pos/ui/Button";

export default function PosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Till error:", error.message);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm" style={{ color: "var(--s-ink-muted)" }}>
        The till could not load. Try again, or open the back office.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/admin"
          className="inline-flex min-h-12 items-center rounded-2xl px-4 text-sm font-bold"
          style={{
            background: "var(--s-panel-alt)",
            color: "var(--s-ink)",
            boxShadow: "inset 0 0 0 1px var(--s-border)",
          }}
        >
          Back office
        </Link>
      </div>
    </div>
  );
}
