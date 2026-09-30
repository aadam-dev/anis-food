"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev; in production you could send to an error reporting service
    console.error("Route error:", error.message);
  }, [error]);

  return (
    <div
      data-surface="pos"
      data-theme="light"
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
    >
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--s-ink-muted)" }}>
          We couldn’t load this page. Please try again.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link href="/admin">
            <Button type="button" variant="outline">
              Back office
            </Button>
          </Link>
          <Link href="/">
            <Button type="button" variant="outline">
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
