"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function CustomerSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        router.push(value.trim() ? `/admin/customers?q=${encodeURIComponent(value.trim())}` : "/admin/customers");
      }}
      className="mb-4 relative"
    >
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
        style={{ color: "var(--s-ink-faint)" }}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by name or phone"
        className="w-full rounded-lg border pl-9 pr-3 py-2.5 min-h-11 outline-none focus:ring-2"
        style={{ background: "var(--s-panel-alt)", borderColor: "var(--s-border)", color: "var(--s-ink)" }}
      />
    </form>
  );
}
