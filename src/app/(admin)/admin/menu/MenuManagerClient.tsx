"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  Check,
  Loader2,
  AlertCircle,
  ImagePlus,
  LayoutGrid,
  List,
  SlidersHorizontal,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import {
  PageHeader,
  Panel,
  EmptyState,
  Chip,
  Table,
  inputClass,
  inputStyle,
} from "@/components/admin/ui";

export interface AdminMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface AdminMenuItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  costPrice: number | null;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  isPopular: boolean;
  isAvailable: boolean;
  /** Plates sold and money taken in the last 30 days. */
  sold30: number;
  revenue30: number;
}

interface Props {
  categories: AdminMenuCategory[];
  items: AdminMenuItem[];
  canSeeCosts: boolean;
  initialView?: "grid" | "costing";
}

type SaveState = { id: string; status: "saving" | "saved" | "error"; message?: string };

export default function MenuManagerClient({ categories, items, canSeeCosts, initialView = "grid" }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "costing">(initialView);
  const [needsCost, setNeedsCost] = useState(false);
  // Costing starts across the whole menu; the grid starts on the first category.
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialView === "costing" ? "all" : (categories[0]?.id ?? "all"),
  );
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftCategory, setDraftCategory] = useState(categories[0]?.id ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [editing, setEditing] = useState<AdminMenuItem | null>(null);
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  // Local echo of edits so a field does not snap back while the server catches up.
  const [overrides, setOverrides] = useState<Record<string, Partial<AdminMenuItem>>>({});

  const merged = useMemo(
    () => items.map((item) => ({ ...item, ...overrides[item.id] })),
    [items, overrides],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return merged.filter((item) => {
      if (categoryFilter !== "all" && item.categoryId !== categoryFilter) return false;
      if (needsCost && item.costPrice !== null) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle)
      );
    });
  }, [merged, search, categoryFilter, needsCost]);

  const unavailableCount = merged.filter((item) => !item.isAvailable).length;
  const costCoverage = canSeeCosts
    ? merged.filter((item) => item.costPrice !== null).length
    : 0;

  async function save(id: string, patch: Partial<AdminMenuItem>) {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setSaves((current) => ({ ...current, [id]: { id, status: "saving" } }));

    try {
      const response = await fetch(`/api/admin/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSaves((current) => ({
          ...current,
          [id]: { id, status: "error", message: data.error ?? "Could not save" },
        }));
        // Drop the optimistic value so the screen stops showing a change that
        // did not happen — a price that looks saved but is not is worse than
        // an obvious failure.
        setOverrides((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        return;
      }

      setSaves((current) => ({ ...current, [id]: { id, status: "saved" } }));
      startTransition(() => router.refresh());
      setTimeout(() => {
        setSaves((current) => {
          const next = { ...current };
          if (next[id]?.status === "saved") delete next[id];
          return next;
        });
      }, 1800);
    } catch {
      setSaves((current) => ({
        ...current,
        [id]: { id, status: "error", message: "No connection" },
      }));
    }
  }

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    const response = await fetch("/api/admin/menu/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.id) {
      setNewCategory("");
      setCategoryFilter(data.id);
      setDraftCategory(data.id);
      startTransition(() => router.refresh());
    }
  }

  async function createDish(event: React.FormEvent) {
    event.preventDefault();
    const price = Number(draftPrice);
    if (!draftName.trim() || !Number.isFinite(price)) return;
    const slugBase = draftName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const response = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: `${slugBase || "dish"}-${Date.now().toString(36)}`,
        name: draftName.trim(),
        price: roundMoney(price),
        categoryId: draftCategory || categoryFilter,
        isAvailable: true,
      }),
    });
    if (response.ok) {
      setAdding(false);
      setDraftName("");
      setDraftPrice("");
      startTransition(() => router.refresh());
    }
  }

  const counts = new Map<string, number>();
  for (const item of merged) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);

  return (
    <>
      <PageHeader
        eyebrow="Menu & stock"
        title="Manage dishes"
        description="What you change here is what the website shows and what the till charges."
        actions={
          <div className="flex flex-wrap gap-2">
            {unavailableCount > 0 && <Chip tone="warn">{unavailableCount} sold out</Chip>}
            {canSeeCosts && (
              <Chip tone={costCoverage === merged.length ? "good" : "neutral"}>
                Cost on {costCoverage}/{merged.length}
              </Chip>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <aside className="s-card flex flex-col p-3">
          <p className="px-2 pb-2 text-sm font-extrabold">Dishes category</p>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className="mb-1 flex items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-semibold"
            style={{
              background: categoryFilter === "all" ? "color-mix(in srgb, var(--s-brand) 10%, white)" : "transparent",
              color: categoryFilter === "all" ? "var(--s-brand)" : "var(--s-ink)",
              boxShadow: categoryFilter === "all" ? "inset 0 0 0 1.5px var(--s-brand)" : undefined,
            }}
          >
            All dishes <span className="money text-xs">{merged.length}</span>
          </button>
          {categories.map((category) => {
            const active = categoryFilter === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(category.id);
                  setDraftCategory(category.id);
                }}
                className="mb-1 flex items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-semibold"
                style={{
                  background: active ? "color-mix(in srgb, var(--s-brand) 10%, white)" : "transparent",
                  color: active ? "var(--s-brand)" : "var(--s-ink)",
                  boxShadow: active ? "inset 0 0 0 1.5px var(--s-brand)" : undefined,
                }}
              >
                {category.name}
                <span className="money text-xs">{counts.get(category.id) ?? 0}</span>
              </button>
            );
          })}
          <form onSubmit={addCategory} className="mt-auto pt-3">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="New category"
              className={`${inputClass} mb-2`}
              style={inputStyle}
              aria-label="New category"
            />
            <button
              type="submit"
              className="w-full rounded-2xl py-3 text-sm font-bold text-white"
              style={{ background: "var(--s-brand)" }}
            >
              Add category
            </button>
          </form>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--s-ink-faint)" }}
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search dishes"
                className={`${inputClass} pl-9`}
                style={inputStyle}
                aria-label="Search menu items"
              />
            </div>
            {canSeeCosts && (
              <div className="flex rounded-2xl p-1" style={{ background: "var(--s-sunk)" }} role="tablist" aria-label="View">
                {(
                  [
                    ["grid", "Dishes", <LayoutGrid key="g" className="h-4 w-4" />],
                    ["costing", "Costing", <List key="l" className="h-4 w-4" />],
                  ] as const
                ).map(([value, label, icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => setView(value)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 text-sm font-bold"
                    style={
                      view === value
                        ? { background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "var(--s-shadow)" }
                        : { color: "var(--s-ink-muted)" }
                    }
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            )}
            {canSeeCosts && (
              <button
                type="button"
                onClick={() => setNeedsCost((value) => !value)}
                aria-pressed={needsCost}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-3 text-sm font-bold"
                style={
                  needsCost
                    ? { background: "var(--s-warn-soft)", color: "var(--s-warn)" }
                    : { background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "var(--s-shadow)" }
                }
              >
                <SlidersHorizontal className="h-4 w-4" /> Needs a cost
                <span className="money text-xs">{merged.length - costCoverage}</span>
              </button>
            )}
            <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white" style={{ background: "var(--s-brand)" }}>
              <Plus className="h-4 w-4" /> Add New Dish
            </button>
          </div>

          {view === "costing" ? (
            <CostingTable items={visible} save={save} saves={saves} />
          ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-56 flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed text-sm font-bold"
              style={{ borderColor: "var(--s-brand)", color: "var(--s-brand)", background: "var(--s-panel)" }}
            >
              <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: "var(--s-brand)" }}>
                <Plus className="h-5 w-5" />
              </span>
              Add New Dish
              {categoryFilter !== "all" && (
                <span className="mt-1 text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
                  to {categories.find((c) => c.id === categoryFilter)?.name}
                </span>
              )}
            </button>
            {visible.map((item) => (
              <article key={item.id} className="s-card relative min-h-56 overflow-hidden p-3">
                <button type="button" onClick={() => setEditing(item)} className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full" style={{ color: "var(--s-ink-muted)" }} aria-label={`Edit ${item.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setEditing(item)} className="w-full text-left">
                <div className="relative mx-auto mt-3 h-24 w-24 overflow-hidden rounded-full bg-[var(--s-panel-alt)]">
                  <Image src={item.imageUrl || "/images/menu/servings.jpg"} alt="" fill className="object-cover" sizes="96px" />
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-semibold" style={{ color: "var(--s-ink-faint)" }}>{item.categoryName}</p>
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="money mt-1 text-sm font-extrabold" style={{ color: "var(--s-ink)" }}>
                    {formatGHS(item.price)}
                  </p>
                  {!item.isAvailable && <Chip tone="warn">Sold out</Chip>}
                  {canSeeCosts && item.costPrice === null && <Chip tone="neutral">No cost</Chip>}
                </div>
                </button>
              </article>
            ))}
          </div>
          )}

          {visible.length === 0 && (
            <Panel className="mt-4">
              <EmptyState
                title={needsCost ? "Every dish here has a cost" : "Nothing in this category"}
                hint={needsCost ? "Turn off “Needs a cost” to see them all." : "Add a dish, or pick another category."}
              />
            </Panel>
          )}
        </section>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center" style={{ background: "rgba(26,29,31,0.35)" }}>
          <form onSubmit={createDish} className="s-card w-full max-w-md space-y-3 p-5">
            <h2 className="text-lg font-extrabold">Add dish</h2>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Dish name"
              className={inputClass}
              style={inputStyle}
              required
              aria-label="Dish name"
            />
            <input
              value={draftPrice}
              onChange={(event) => setDraftPrice(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Price"
              inputMode="decimal"
              className={`${inputClass} money`}
              style={inputStyle}
              required
              aria-label="Price"
            />
            <select
              value={draftCategory || categoryFilter}
              onChange={(event) => setDraftCategory(event.target.value)}
              className={inputClass}
              style={inputStyle}
              aria-label="Category"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-2xl py-3 font-bold text-white" style={{ background: "var(--s-brand)" }}>
                Save dish
              </button>
              <button type="button" onClick={() => setAdding(false)} className="rounded-2xl px-4 py-3 font-bold" style={{ color: "var(--s-ink-muted)" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center" style={{ background: "rgba(26,29,31,0.35)" }}>
          <div className="s-card max-h-[90dvh] w-full max-w-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--s-border)" }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--s-ink-faint)" }}>Edit dish</p>
                <h2 className="font-extrabold">{editing.name}</h2>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl px-3 text-sm font-bold">Close</button>
            </div>
            <ul>
              <MenuRow item={editing} canSeeCosts={canSeeCosts} save={save} state={saves[editing.id]} />
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function MenuRow({
  item,
  canSeeCosts,
  save,
  state,
}: {
  item: AdminMenuItem;
  canSeeCosts: boolean;
  save: (id: string, patch: Partial<AdminMenuItem>) => void;
  state?: SaveState;
}) {
  const [priceText, setPriceText] = useState(item.price.toFixed(2));
  const [costText, setCostText] = useState(item.costPrice?.toFixed(2) ?? "");

  function commitPrice() {
    const parsed = Number(priceText);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setPriceText(item.price.toFixed(2));
      return;
    }
    const rounded = roundMoney(parsed);
    if (rounded === item.price) {
      setPriceText(rounded.toFixed(2));
      return;
    }
    setPriceText(rounded.toFixed(2));
    save(item.id, { price: rounded });
  }

  function commitCost() {
    const trimmed = costText.trim();
    if (trimmed === "") {
      if (item.costPrice !== null) save(item.id, { costPrice: null });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setCostText(item.costPrice?.toFixed(2) ?? "");
      return;
    }
    const rounded = roundMoney(parsed);
    if (rounded === item.costPrice) return;
    setCostText(rounded.toFixed(2));
    save(item.id, { costPrice: rounded });
  }

  const margin =
    canSeeCosts && item.costPrice !== null && item.price > 0
      ? ((item.price - item.costPrice) / item.price) * 100
      : null;

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <ImageControl item={item} save={save} />
        <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{item.name}</p>
            {item.isPopular && <Chip tone="good">Popular</Chip>}
            {!item.isAvailable && <Chip tone="warn">Sold out</Chip>}
          </div>
          <p className="mt-0.5 text-sm truncate" style={{ color: "var(--s-ink-muted)" }}>
            {item.categoryName}
            {item.description ? ` · ${item.description}` : ""}
          </p>
        </div>

        <div className="flex items-end gap-3">
          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "var(--s-ink-faint)" }}>
              Price
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm" style={{ color: "var(--s-ink-faint)" }}>
                GH₵
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={priceText}
                onChange={(event) => setPriceText(event.target.value)}
                onBlur={commitPrice}
                onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                className="money w-28 rounded-2xl border px-3 py-2 text-right outline-none min-h-12 focus:ring-2"
                style={inputStyle}
                aria-label={`Price of ${item.name}`}
              />
            </div>
          </label>

          {canSeeCosts && (
            <label className="block">
              <span className="block text-xs mb-1" style={{ color: "var(--s-ink-faint)" }}>
                Cost
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm" style={{ color: "var(--s-ink-faint)" }}>
                  GH₵
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={costText}
                  placeholder="—"
                  onChange={(event) => setCostText(event.target.value)}
                  onBlur={commitCost}
                  onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                  className="money w-28 rounded-2xl border px-3 py-2 text-right outline-none min-h-12 focus:ring-2"
                  style={inputStyle}
                  aria-label={`Cost price of ${item.name}`}
                />
              </div>
            </label>
          )}

          {margin !== null && (
            <div className="pb-2">
              <span className="block text-xs mb-1" style={{ color: "var(--s-ink-faint)" }}>
                Margin
              </span>
              <span
                className="money text-sm font-semibold"
                style={{ color: margin >= 55 ? "var(--s-good)" : "var(--s-warn)" }}
              >
                {margin.toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={item.isAvailable}
              onChange={(event) => save(item.id, { isAvailable: event.target.checked })}
              className="h-5 w-5 rounded"
            />
            <span style={{ color: "var(--s-ink-muted)" }}>On the menu</span>
          </label>

          <span className="w-24 text-xs" aria-live="polite">
            {state?.status === "saving" && (
              <span className="inline-flex items-center gap-1" style={{ color: "var(--s-ink-faint)" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving
              </span>
            )}
            {state?.status === "saved" && (
              <span className="inline-flex items-center gap-1" style={{ color: "var(--s-good)" }}>
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {state?.status === "error" && (
              <span className="inline-flex items-center gap-1" style={{ color: "var(--s-bad)" }}>
                <AlertCircle className="w-3.5 h-3.5" /> {state.message}
              </span>
            )}
          </span>
        </div>
      </div>

      {item.costPrice === null && canSeeCosts && (
        <p className="mt-2 text-xs" style={{ color: "var(--s-ink-faint)" }}>
          No cost price yet, so {formatGHS(item.price)} counts as pure revenue in the
          profit report. Add one when you know it.
        </p>
      )}
    </li>
  );
}

/**
 * The photo for a dish. Tap it to pick an image; it uploads, then saves the
 * returned URL to the item. The picked file is shown immediately as a local
 * preview so the admin sees the change before the round-trip finishes.
 */
function ImageControl({
  item,
  save,
}: {
  item: AdminMenuItem;
  save: (id: string, patch: Partial<AdminMenuItem>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shown = preview ?? item.imageUrl;

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after a failure
    if (!file) return;

    setError(false);
    setBusy(true);
    setPreview(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(true);
        setErrorMessage(data.error ?? "Could not upload that image.");
        setPreview(null);
        return;
      }
      setErrorMessage(null);
      save(item.id, { imageUrl: data.url });
    } catch {
      setError(true);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-16 w-16 rounded-lg overflow-hidden grid place-items-center border"
        style={{ background: "var(--s-panel-alt)", borderColor: error ? "var(--s-bad)" : "var(--s-border)" }}
        aria-label={shown ? `Change photo for ${item.name}` : `Add a photo for ${item.name}`}
      >
        {shown ? (
          <Image src={shown} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized={!!preview} />
        ) : (
          <ImagePlus className="w-5 h-5" style={{ color: "var(--s-ink-faint)" }} />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center" style={{ background: "rgba(0,0,0,0.4)" }}>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
      {errorMessage && (
        <p className="mt-1 w-16 text-[0.6rem] leading-tight" style={{ color: "var(--s-bad)" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/** Food cost as a share of price. Most kitchens aim for 28–35%. */
function foodCostTone(share: number): "good" | "warn" | "bad" {
  if (share <= 35) return "good";
  if (share <= 45) return "warn";
  return "bad";
}

/**
 * Every dish in one sheet, best sellers first, with price and cost editable in
 * place. Built for an afternoon of costing: tab down the Cost column, and each
 * figure saves as you leave the field.
 */
function CostingTable({
  items,
  save,
  saves,
}: {
  items: AdminMenuItem[];
  save: (id: string, patch: Partial<AdminMenuItem>) => void;
  saves: Record<string, SaveState>;
}) {
  const sorted = [...items].sort((a, b) => b.revenue30 - a.revenue30 || a.name.localeCompare(b.name));
  const totalRevenue = items.reduce((sum, item) => sum + item.revenue30, 0);
  const covered = items.filter((item) => item.costPrice !== null).reduce((sum, item) => sum + item.revenue30, 0);

  return (
    <Panel
      title="Dish costing"
      explainer={
        <>
          What each plate costs to make: ingredients, packaging, gas. Best sellers first. Each figure saves when you
          leave the box.{" "}
          <a href="/admin/help#costing" className="font-semibold underline" style={{ color: "var(--s-brand)" }}>
            How to cost a dish
          </a>
        </>
      }
      action={
        <Chip tone={totalRevenue > 0 && covered / totalRevenue >= 0.9 ? "good" : "warn"}>
          {totalRevenue > 0 ? Math.round((covered / totalRevenue) * 100) : 0}% of sales costed
        </Chip>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState title="No dishes to show" />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Dish</th>
              <th className="num">Sold · 30 days</th>
              <th className="num">Price</th>
              <th className="num">Cost</th>
              <th className="num">Food cost</th>
              <th className="num">Kept per plate</th>
              <th aria-label="Save status" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <CostingRow key={item.id} item={item} save={save} state={saves[item.id]} />
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function CostingRow({
  item,
  save,
  state,
}: {
  item: AdminMenuItem;
  save: (id: string, patch: Partial<AdminMenuItem>) => void;
  state?: SaveState;
}) {
  const [priceText, setPriceText] = useState(item.price.toFixed(2));
  const [costText, setCostText] = useState(item.costPrice?.toFixed(2) ?? "");

  function commit(text: string, current: number | null, field: "price" | "costPrice", reset: (value: string) => void) {
    const trimmed = text.trim();
    if (trimmed === "") {
      if (field === "costPrice" && current !== null) save(item.id, { costPrice: null });
      if (field === "price") reset(item.price.toFixed(2));
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      reset(current?.toFixed(2) ?? "");
      return;
    }
    const rounded = roundMoney(parsed);
    reset(rounded.toFixed(2));
    if (rounded !== current) save(item.id, { [field]: rounded });
  }

  // Live from what is typed, so the margin answers "what if" before saving.
  const price = Number(priceText) || 0;
  const cost = costText.trim() === "" ? null : Number(costText);
  const share = cost !== null && Number.isFinite(cost) && price > 0 ? (cost / price) * 100 : null;
  const kept = share !== null ? price - (cost ?? 0) : null;

  const field =
    "money w-24 rounded-xl border px-2.5 py-1.5 text-right outline-none focus:ring-2 !min-h-10";

  return (
    <tr>
      <td>
        <span className="block font-semibold">{item.name}</span>
        <span className="block text-xs" style={{ color: "var(--s-ink-faint)" }}>
          {item.categoryName}
          {!item.isAvailable && " · sold out"}
        </span>
      </td>
      <td className="num muted">
        {item.sold30 > 0 ? (
          <>
            {item.sold30}
            <span className="block text-xs">{formatGHS(item.revenue30)}</span>
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="num">
        <input
          inputMode="decimal"
          value={priceText}
          onChange={(event) => setPriceText(event.target.value)}
          onBlur={() => commit(priceText, item.price, "price", setPriceText)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className={field}
          style={inputStyle}
          aria-label={`Price of ${item.name}`}
        />
      </td>
      <td className="num">
        <input
          inputMode="decimal"
          value={costText}
          placeholder="Add"
          onChange={(event) => setCostText(event.target.value)}
          onBlur={() => commit(costText, item.costPrice, "costPrice", setCostText)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className={field}
          style={{ ...inputStyle, ...(item.costPrice === null ? { borderColor: "var(--s-warn)" } : {}) }}
          aria-label={`Cost of ${item.name}`}
        />
      </td>
      <td className="num">{share === null ? "—" : <Chip tone={foodCostTone(share)}>{Math.round(share)}%</Chip>}</td>
      <td className="num">{kept === null ? "—" : formatGHS(kept)}</td>
      <td className="w-20 text-xs" aria-live="polite">
        {state?.status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--s-ink-faint)" }} />}
        {state?.status === "saved" && <Check className="h-3.5 w-3.5" style={{ color: "var(--s-good)" }} />}
        {state?.status === "error" && (
          <span className="inline-flex items-center gap-1" style={{ color: "var(--s-bad)" }}>
            <AlertCircle className="h-3.5 w-3.5" /> {state.message}
          </span>
        )}
      </td>
    </tr>
  );
}
