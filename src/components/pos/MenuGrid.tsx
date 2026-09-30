"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";
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
  locked = false,
}: {
  categories: PosCategory[];
  items: PosMenuItem[];
  quantities: Record<string, number>;
  tickets: OrderView[];
  onAdd: (item: PosMenuItem) => void;
  onOpenTicket: (ticket: OrderView) => void;
  /** True while an old shift is still open: the menu is visible but cannot ring. */
  locked?: boolean;
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
  const categoryCount = category === "popular"
    ? items.filter((item) => item.isPopular).length
    : items.filter((item) => item.categoryId === category).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--s-ink-faint)" }}>
            Choose category
          </p>
          <h1 className="truncate text-lg font-extrabold">
            {category === "popular" ? "Popular dishes" : categories.find((entry) => entry.id === category)?.name}
            <span className="ml-2 text-xs font-bold" style={{ color: "var(--s-brand)" }}>
              {categoryCount} items
            </span>
          </h1>
        </div>
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
            className="w-56 rounded-2xl pl-9 pr-10 py-3 outline-none max-sm:w-44"
            style={{
              background: "var(--s-panel-alt)",
              color: "var(--s-ink)",
              boxShadow: "inset 0 0 0 1px var(--s-border)",
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
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          <CategoryChip
            active={category === "popular"}
            onClick={() => setCategory("popular")}
            label="Popular"
            icon={<Star className="h-3.5 w-3.5" />}
          />
          {categories.map((entry) => (
            <CategoryChip
              key={entry.id}
              active={category === entry.id}
              onClick={() => setCategory(entry.id)}
              label={entry.name}
              count={items.filter((item) => item.categoryId === entry.id).length}
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Nothing here. Try another search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <article
                  key={item.id}
                  className="s-card relative flex min-h-52 flex-col items-center overflow-hidden p-3 text-center"
                  style={
                    qty > 0
                      ? { boxShadow: "var(--s-shadow), inset 0 0 0 1.5px var(--s-brand)" }
                      : undefined
                  }
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
                  <span className="mt-2 block min-h-10 text-sm font-bold leading-snug line-clamp-2">
                    {item.name}
                  </span>
                  <span
                    className="money mt-1 block text-sm font-extrabold"
                    style={{ color: "var(--s-ink)" }}
                  >
                    {formatGHS(item.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdd(item)}
                    disabled={locked}
                    className="mt-3 w-full rounded-xl py-2 text-xs font-extrabold active:scale-[0.98] disabled:opacity-45"
                    style={{
                      background: qty > 0 ? "var(--s-brand)" : "transparent",
                      color: qty > 0 ? "#fff" : "var(--s-brand)",
                      boxShadow: qty > 0 ? undefined : "inset 0 0 0 1px var(--s-brand)",
                    }}
                  >
                    {qty > 0 ? `Added · ${qty}` : "Add"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemThumb({ item }: { item: PosMenuItem }) {
  return (
    <DishThumb
      name={item.name}
      imageUrl={item.imageUrl}
      className="h-24 w-24 rounded-full shadow-sm sm:h-28 sm:w-28"
      letterClassName="text-2xl"
    />
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors"
      style={{
        background: active ? "var(--s-brand)" : "var(--s-panel-alt)",
        color: active ? "#fff" : "var(--s-ink-muted)",
        boxShadow: active ? undefined : "inset 0 0 0 1px var(--s-border)",
      }}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="money text-[10px]" style={{ opacity: 0.72 }}>
          {count}
        </span>
      )}
    </button>
  );
}
