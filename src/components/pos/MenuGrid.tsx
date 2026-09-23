"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import type { OrderView, PosCategory, PosMenuItem } from "./types";
import DishThumb from "./DishThumb";

export default function MenuGrid({
  categories,
  items,
  quantities,
  tickets,
  onAdd,
  onOpenTicket,
}: {
  categories: PosCategory[];
  items: PosMenuItem[];
  quantities: Record<string, number>;
  tickets: OrderView[];
  onAdd: (item: PosMenuItem) => void;
  onOpenTicket: (ticket: OrderView) => void;
}) {
  const [category, setCategory] = useState<string>("popular");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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
            className="w-full rounded-xl border pl-9 pr-10 py-3 outline-none"
            style={{
              background: "var(--s-panel-alt)",
              borderColor: "var(--s-border)",
              color: "var(--s-ink)",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-lg"
              style={{ color: "var(--s-ink-muted)" }}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!search && tickets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-3 no-scrollbar">
          {tickets.map((ticket) => {
            const minutes = Math.max(
              0,
              Math.floor((now - new Date(ticket.createdAt).getTime()) / 60000),
            );
            const label = ticket.customerName?.trim() || callNumber(ticket.orderNumber);
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onOpenTicket(ticket)}
                className="shrink-0 rounded-xl border px-3 py-2 text-left"
                style={{
                  background: "color-mix(in srgb, var(--s-warn) 14%, transparent)",
                  borderColor: "color-mix(in srgb, var(--s-warn) 45%, transparent)",
                }}
              >
                <span
                  className="block max-w-[9rem] truncate text-xs font-bold"
                  style={{ color: "var(--s-warn)" }}
                >
                  {label}
                </span>
                <span className="block text-[11px]" style={{ color: "var(--s-ink-muted)" }}>
                  {formatGHS(ticket.total)} · {minutes}m
                </span>
              </button>
            );
          })}
        </div>
      )}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {visible.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => onAdd(item)}
                  className="relative rounded-2xl border overflow-hidden text-left active:scale-[0.98] transition-transform flex flex-col"
                  style={{
                    background: qty > 0 ? "color-mix(in srgb, var(--s-brand) 12%, var(--s-panel))" : "var(--s-panel)",
                    borderColor: qty > 0 ? "var(--s-brand)" : "var(--s-border)",
                  }}
                >
                  {qty > 0 && (
                    <span
                      className="absolute top-2 right-2 z-10 min-w-6 h-6 px-1.5 rounded-full grid place-items-center text-xs font-bold text-white"
                      style={{ background: "var(--s-brand)" }}
                    >
                      {qty}
                    </span>
                  )}
                  <ItemThumb item={item} />
                  <span className="px-3 pt-2 block text-sm font-semibold leading-snug line-clamp-2">
                    {item.name}
                  </span>
                  <span
                    className="money px-3 pb-3 pt-1 block text-sm font-bold"
                    style={{ color: "var(--s-brand)" }}
                  >
                    {formatGHS(item.price)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemThumb({ item }: { item: PosMenuItem }) {
  return <DishThumb name={item.name} imageUrl={item.imageUrl} />;
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
      className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap"
      style={{
        background: active ? "var(--s-brand)" : "var(--s-panel)",
        borderColor: active ? "var(--s-brand)" : "var(--s-border)",
        color: active ? "#fff" : "var(--s-ink-muted)",
      }}
    >
      {label}
    </button>
  );
}
