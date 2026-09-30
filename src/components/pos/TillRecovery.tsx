"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";

/** Shown instead of the register when the books update is not on the database. */
export default function TillRecovery({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">The till is not ready</h1>
      <p className="mt-2 max-w-md text-sm" style={{ color: "var(--s-ink-muted)" }}>
        {message}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => router.refresh()}>
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
