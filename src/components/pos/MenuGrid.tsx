"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { LayoutGrid, Search, Star, X } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import type { OrderView, PosCategory, PosMenuItem } from "./types";
import DishThumb from "./DishThumb";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearch(item: PosMenuItem, categoryName: string | undefined, needle: string): boolean {
  const tokens = normalize(needle).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalize(`${item.name} ${categoryName ?? ""} ${item.slug ?? ""}`);
  return tokens.every((token) => haystack.includes(token));
}

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
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const categoryNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of categories) map[entry.id] = entry.name;
    return map;
  }, [categories]);

  const visible = useMemo(() => {
    const needle = deferredSearch.trim();
    let list = items;
    if (needle) {
      list = items.filter((item) => matchesSearch(item, categoryNames[item.categoryId], needle));
    } else if (category === "popular") {
      const popular = items.filter((item) => item.isPopular);
      list = popular.length > 0 ? popular : items;
    } else if (category !== "all") {
      list = items.filter((item) => item.categoryId === category);
    }
    return list;
  }, [items, category, deferredSearch, categoryNames]);

  const heading =
    deferredSearch.trim()
      ? "Search results"
      : category === "all"
        ? "All dishes"
        : category === "popular"
          ? "Popular dishes"
          : categories.find((entry) => entry.id === category)?.name ?? "Menu";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 px-4 pt-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
            style={{ color: "var(--s-ink-muted)" }}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes, e.g. jollof or fries"
            aria-label="Search the menu"
            className="w-full min-h-14 rounded-[1.25rem] border pl-12 pr-12 text-base font-medium outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--s-brand)_35%,transparent)]"
            style={{
              background: "var(--s-panel)",
              borderColor: "var(--s-border)",
              color: "var(--s-ink)",
              boxShadow: "var(--s-shadow)",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl"
              style={{ color: "var(--s-ink-muted)" }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--s-ink-faint)" }}>
              Menu
            </p>
            <h1 className="truncate text-lg font-extrabold">
              {heading}
              <span className="ml-2 text-xs font-bold" style={{ color: "var(--s-brand)" }}>
                {visible.length} item{visible.length === 1 ? "" : "s"}
              </span>
            </h1>
          </div>
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

      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        <CategoryChip
          active={!search && category === "all"}
          onClick={() => {
            setSearch("");
            setCategory("all");
          }}
          label="All"
          icon={<LayoutGrid className="h-3.5 w-3.5" />}
          count={items.length}
        />
        <CategoryChip
          active={!search && category === "popular"}
          onClick={() => {
            setSearch("");
            setCategory("popular");
          }}
          label="Popular"
          icon={<Star className="h-3.5 w-3.5" />}
          count={items.filter((item) => item.isPopular).length}
        />
        {categories.map((entry) => (
          <CategoryChip
            key={entry.id}
            active={!search && category === entry.id}
            onClick={() => {
              setSearch("");
              setCategory(entry.id);
            }}
            label={entry.name}
            count={items.filter((item) => item.categoryId === entry.id).length}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Nothing matched. Try another word or clear the search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAdd(item)}
                  disabled={locked}
                  className="group relative flex min-h-52 flex-col overflow-hidden rounded-[1.35rem] p-0 text-left transition-transform active:scale-[0.98] disabled:opacity-45"
                  style={{
                    background: "var(--s-panel)",
                    boxShadow:
                      qty > 0
                        ? "var(--s-shadow), inset 0 0 0 1.5px var(--s-brand)"
                        : "0 10px 28px rgba(26, 29, 31, 0.06), 0 1px 2px rgba(26, 29, 31, 0.04)",
                  }}
                >
                  {qty > 0 && (
                    <span
                      className="absolute top-2.5 right-2.5 z-10 grid min-w-6 place-items-center rounded-full px-1.5 h-6 text-xs font-bold text-white"
                      style={{ background: "var(--s-brand)" }}
                    >
                      {qty}
                    </span>
                  )}
                  <DishThumb
                    name={item.name}
                    imageUrl={item.imageUrl}
                    className="aspect-[4/3] w-full rounded-t-[1.35rem]"
                    letterClassName="text-3xl"
                  />
                  <span className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
                    <span className="line-clamp-2 min-h-10 text-sm font-bold leading-snug">
                      {item.name}
                    </span>
                    <span className="mt-auto flex items-center justify-between gap-2">
                      <span className="money text-sm font-extrabold">{formatGHS(item.price)}</span>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                        style={{
                          background: qty > 0 ? "var(--s-brand)" : "color-mix(in srgb, var(--s-brand) 12%, transparent)",
                          color: qty > 0 ? "#fff" : "var(--s-brand)",
                        }}
                      >
                        {qty > 0 ? `Added · ${qty}` : "Add"}
                      </span>
                    </span>
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
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors"
      style={{
        background: active ? "var(--s-brand)" : "var(--s-panel)",
        color: active ? "#fff" : "var(--s-ink-muted)",
        boxShadow: active ? undefined : "0 1px 2px rgba(26,29,31,0.05), inset 0 0 0 1px var(--s-border)",
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
