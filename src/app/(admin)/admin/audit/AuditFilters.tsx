"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputClass, inputStyle } from "@/components/admin/ui";

/** Area and person filters; they live in the URL so a filtered view can be shared. */
export default function AuditFilters({
  areas,
  people,
  area,
  who,
}: {
  areas: string[];
  people: { id: string; name: string }[];
  area: string;
  who: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const set = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:max-w-xl">
      <select value={area} onChange={(event) => set("area", event.target.value)} className={inputClass} style={inputStyle} aria-label="Area">
        <option value="">Every area</option>
        {areas.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>
      <select value={who} onChange={(event) => set("who", event.target.value)} className={inputClass} style={inputStyle} aria-label="Person">
        <option value="">Everyone</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </div>
  );
}
