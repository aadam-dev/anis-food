"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { inputClass, inputStyle } from "@/components/admin/ui";

/** Searches as you type (after a short pause), and clearing the box shows everyone again. */
export default function CustomerSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const last = useRef(initial.trim());

  useEffect(() => {
    const query = value.trim();
    if (query === last.current) return;
    const timer = window.setTimeout(() => {
      last.current = query;
      startTransition(() =>
        router.replace(query ? `/admin/customers?q=${encodeURIComponent(query)}` : "/admin/customers", { scroll: false }),
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [value, router]);

  return (
    <form onSubmit={(event) => event.preventDefault()} className="relative mb-4" role="search">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--s-ink-faint)" }} />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by name or phone"
        className={`${inputClass} pl-10 pr-10`}
        style={inputStyle}
        aria-label="Search customers"
      />
      {pending && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" style={{ color: "var(--s-ink-faint)" }} />
      )}
    </form>
  );
}
