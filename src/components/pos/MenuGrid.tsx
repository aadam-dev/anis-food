"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatGHS } from "@/lib/money";
import type { PosCategory, PosMenuItem } from "./types";

export default function MenuGrid({
  categories,
  items,
  onAdd,
}: {
  categories: PosCategory[];
  items: PosMenuItem[];
  onAdd: (item: PosMenuItem) => void;
}) {
  const [category, setCategory] = useState<string>("popular");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle) {
      // Search cuts across categories: at the counter you know the dish, not
      // which tab it lives under.
      return items.filter((item) => item.name.toLowerCase().includes(needle));
    }
    if (category === "popular") {
      const popular = items.filter((item) => item.isPopular);
      return popular.length > 0 ? popular : items;
    }
    return items.filter((item) => item.categoryId === category);
  }, [items, category, search]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 pt-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--s-ink-faint)" }}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="w-full rounded-xl border pl-9 pr-3 py-3 outline-none focus:ring-2"
            style={{
              background: "var(--s-panel-alt)",
              borderColor: "var(--s-border)",
              color: "var(--s-ink)",
            }}
          />
        </div>
      </div>

      {!search && (
        <div className="flex gap-2 overflow-x-auto px-3 py-3 no-scrollbar">
          <CategoryChip
            active={category === "popular"}
            onClick={() => setCategory("popular")}
            label="Popular"
          />
          {categories.map((entry) => (
            <CategoryChip
              key={entry.id}
              active={category === entry.id}
              onClick={() => setCategory(entry.id)}
              label={entry.name}
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Nothing here. Try another search.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {visible.map((item) => (
              <button
                key={item.id}
                onClick={() => onAdd(item)}
                className="rounded-xl border overflow-hidden text-left active:scale-[0.98] transition-transform flex flex-col"
                style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
              >
                <ItemThumb item={item} />
                <span className="px-3 pt-2 block text-sm font-medium leading-snug line-clamp-2">
                  {item.name}
                </span>
                <span
                  className="money px-3 pb-3 pt-1 block text-sm font-bold"
                  style={{ color: "var(--s-brand)" }}
                >
                  {formatGHS(item.price)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A warm tint derived from the name, so the items that have no photo yet look
// like a deliberate set of tiles rather than broken images. The first letter
// sits in the middle — enough for a cashier to tell dishes apart at a glance.
const THUMB_TINTS = ["#F70E07", "#F07704", "#D40D06", "#B45309", "#9A3412", "#7C2D12"];

function ItemThumb({ item }: { item: PosMenuItem }) {
  const [failed, setFailed] = useState(false);
  const showImage = item.imageUrl && !failed;

  if (showImage) {
    return (
      <span className="block w-full aspect-[4/3] overflow-hidden" style={{ background: "var(--s-panel-alt)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- POS grid needs the
            service worker to cache these directly; next/image's loader would not. */}
        <img
          src={item.imageUrl!}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  const tint = THUMB_TINTS[hashString(item.name) % THUMB_TINTS.length];
  return (
    <span
      className="w-full aspect-[4/3] grid place-items-center text-2xl font-bold text-white/90"
      style={{ background: tint }}
      aria-hidden="true"
    >
      {item.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap"
      style={{
        background: active ? "var(--s-brand)" : "var(--s-panel)",
        color: active ? "#fff" : "var(--s-ink-muted)",
      }}
    >
      {label}
    </button>
  );
}
