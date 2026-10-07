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
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings2,
  EyeOff,
} from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import {
  PageHeader,
  Panel,
  EmptyState,
  Chip,
  Table,
  Dialog,
  ConfirmDialog,
  AdminButton,
  Field,
  inputClass,
  inputStyle,
} from "@/components/admin/ui";

export interface AdminMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** Dishes in the category, sold out or not. */
  count: number;
}

export interface AdminMenuSize {
  id: string;
  label: string;
  price: number;
  costPrice: number | null;
  isAvailable: boolean;
  sold30: number;
  revenue30: number;
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
  /** Order lines ever rung up for this dish. A sold dish is hidden, never deleted. */
  timesSold: number;
  /** Plates sold and money taken in the last 30 days. */
  sold30: number;
  revenue30: number;
  /** Empty when the dish has one price. */
  sizes: AdminMenuSize[];
}

interface Props {
  categories: AdminMenuCategory[];
  items: AdminMenuItem[];
  canSeeCosts: boolean;
  initialView?: "grid" | "costing";
}

type SaveState = { status: "saving" | "saved" | "error"; message?: string };
type SizeInput = { id?: string; label: string; price: number; costPrice?: number | null; isAvailable: boolean };

/** A dish is costed when it has a cost, or every size still on sale has one. */
function needsCost(item: AdminMenuItem): boolean {
  if (item.sizes.length > 0) return item.sizes.some((size) => size.isAvailable && size.costPrice === null);
  return item.costPrice === null;
}

/** Parse a money box: null for empty, NaN for nonsense. */
function parseMoney(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? roundMoney(value) : Number.NaN;
}

async function send(url: string, method: string, body: unknown): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error ?? "Could not save. Try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No connection. Check the internet and try again." };
  }
}

export default function MenuManagerClient({ categories, items, canSeeCosts, initialView = "grid" }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "costing">(initialView);
  const [onlyNeedsCost, setOnlyNeedsCost] = useState(false);
  // Costing starts across the whole menu; the grid starts on the first category.
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialView === "costing" ? "all" : (categories[0]?.id ?? "all"),
  );
  const [adding, setAdding] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  // An id, not a copy: the dialog always reads the live dish from `merged`.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  // Local echo of edits so a field does not snap back while the server catches up.
  const [overrides, setOverrides] = useState<Record<string, Partial<AdminMenuItem>>>({});
  // Fresh data from the server replaces every local echo.
  const [seenItems, setSeenItems] = useState(items);
  if (seenItems !== items) {
    setSeenItems(items);
    setOverrides({});
  }

  const refresh = () => startTransition(() => router.refresh());

  const merged = useMemo(() => items.map((item) => ({ ...item, ...overrides[item.id] })), [items, overrides]);
  const editing = editingId ? (merged.find((item) => item.id === editingId) ?? null) : null;

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return merged.filter((item) => {
      if (categoryFilter !== "all" && item.categoryId !== categoryFilter) return false;
      if (onlyNeedsCost && !needsCost(item)) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        item.sizes.some((size) => size.label.toLowerCase().includes(needle))
      );
    });
  }, [merged, search, categoryFilter, onlyNeedsCost]);

  const unavailableCount = merged.filter((item) => !item.isAvailable).length;
  const uncosted = canSeeCosts ? merged.filter(needsCost).length : 0;

  function markSave(id: string, state: SaveState | null) {
    setSaves((current) => {
      const next = { ...current };
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });
    if (state?.status === "saved") {
      setTimeout(() => setSaves((current) => {
        if (current[id]?.status !== "saved") return current;
        const next = { ...current };
        delete next[id];
        return next;
      }), 1800);
    }
  }

  /** Save some fields of a dish, showing them at once and undoing them if the server says no. */
  async function saveItem(id: string, patch: Partial<AdminMenuItem>): Promise<string | null> {
    const before = overrides[id];
    setOverrides((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    markSave(id, { status: "saving" });
    const result = await send(`/api/admin/menu/${id}`, "PATCH", patch);
    if (!result.ok) {
      // A price that looks saved but is not is worse than an obvious failure.
      setOverrides((current) => ({ ...current, [id]: before ?? {} }));
      markSave(id, { status: "error", message: result.error });
      return result.error;
    }
    markSave(id, { status: "saved" });
    refresh();
    return null;
  }

  /** Save a dish's whole size list. Sales figures stay with the sizes they belong to. */
  async function saveSizes(item: AdminMenuItem, sizes: SizeInput[]): Promise<string | null> {
    markSave(item.id, { status: "saving" });
    const result = await send(`/api/admin/menu/${item.id}/sizes`, "PUT", {
      sizes: sizes.map((size) => (canSeeCosts ? size : { ...size, costPrice: undefined })),
    });
    if (!result.ok) {
      markSave(item.id, { status: "error", message: result.error });
      return result.error;
    }
    const saved = (result.data.sizes ?? []) as Omit<AdminMenuSize, "sold30" | "revenue30">[];
    const nextSizes = saved.map((size) => {
      const old = item.sizes.find((entry) => entry.id === size.id);
      return { ...size, sold30: old?.sold30 ?? 0, revenue30: old?.revenue30 ?? 0 };
    });
    const onSale = nextSizes.filter((size) => size.isAvailable);
    setOverrides((current) => ({
      ...current,
      [item.id]: {
        ...current[item.id],
        sizes: nextSizes,
        ...(onSale.length > 0 ? { price: Math.min(...onSale.map((size) => size.price)) } : {}),
      },
    }));
    markSave(item.id, { status: "saved" });
    refresh();
    return null;
  }

  const activeCategory = categories.find((category) => category.id === categoryFilter);

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Manage dishes"
        description="What you change here is what the website shows and what the till charges."
        actions={
          <div className="flex flex-wrap gap-2">
            {unavailableCount > 0 && <Chip tone="warn">{unavailableCount} off the menu</Chip>}
            {canSeeCosts && (
              <Chip tone={uncosted === 0 ? "good" : "neutral"}>
                Costed {merged.length - uncosted}/{merged.length}
              </Chip>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <aside className="s-card flex flex-col p-3">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-sm font-extrabold">Categories</p>
            <button
              type="button"
              onClick={() => setManagingCategories(true)}
              className="inline-flex items-center gap-1 rounded-xl px-2 text-xs font-bold !min-h-9"
              style={{ color: "var(--s-brand)" }}
            >
              <Settings2 className="h-3.5 w-3.5" /> Manage
            </button>
          </div>
          <CategoryButton active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} label="All dishes" count={merged.length} />
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              active={categoryFilter === category.id}
              onClick={() => setCategoryFilter(category.id)}
              label={category.name}
              count={category.count}
              hidden={!category.isActive}
            />
          ))}
          <AddCategoryForm
            onAdded={(id) => {
              setCategoryFilter(id);
              refresh();
            }}
          />
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--s-ink-faint)" }} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search dishes"
                className={`${inputClass} pl-9`}
                style={inputStyle}
                aria-label="Search dishes"
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
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 text-sm font-bold !min-h-10"
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
                onClick={() => setOnlyNeedsCost((value) => !value)}
                aria-pressed={onlyNeedsCost}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-3 text-sm font-bold"
                style={
                  onlyNeedsCost
                    ? { background: "var(--s-warn-soft)", color: "var(--s-warn)" }
                    : { background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "var(--s-shadow)" }
                }
              >
                <SlidersHorizontal className="h-4 w-4" /> Needs a cost
                <span className="money text-xs">{uncosted}</span>
              </button>
            )}
            <AdminButton variant="primary" onClick={() => setAdding(true)} disabled={categories.length === 0}>
              <Plus className="h-4 w-4" /> Add dish
            </AdminButton>
          </div>

          {view === "costing" && canSeeCosts ? (
            <CostingTable items={visible} saveItem={saveItem} saveSizes={saveSizes} saves={saves} onOpen={setEditingId} />
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setAdding(true)}
                disabled={categories.length === 0}
                className="flex min-h-56 flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed text-sm font-bold disabled:opacity-50"
                style={{ borderColor: "var(--s-brand)", color: "var(--s-brand)", background: "var(--s-panel)" }}
              >
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: "var(--s-brand)" }}>
                  <Plus className="h-5 w-5" />
                </span>
                Add dish
                {activeCategory && (
                  <span className="mt-1 text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
                    to {activeCategory.name}
                  </span>
                )}
              </button>
              {visible.map((item) => (
                <DishCard key={item.id} item={item} canSeeCosts={canSeeCosts} onOpen={() => setEditingId(item.id)} />
              ))}
            </div>
          )}

          {visible.length === 0 && (
            <Panel className="mt-4">
              <EmptyState
                title={onlyNeedsCost ? "Every dish here has a cost" : search ? "No dish matches that search" : "Nothing in this category yet"}
                hint={onlyNeedsCost ? "Turn off “Needs a cost” to see them all." : "Add a dish, or pick another category."}
              />
            </Panel>
          )}
        </section>
      </div>

      <AddDishDialog
        open={adding}
        categories={categories}
        defaultCategory={activeCategory?.id ?? categories[0]?.id ?? ""}
        onClose={() => setAdding(false)}
        onAdded={(categoryId) => {
          setAdding(false);
          setCategoryFilter(categoryId);
          refresh();
        }}
      />

      {editing && (
        <EditDishDialog
          key={editing.id}
          item={editing}
          categories={categories}
          canSeeCosts={canSeeCosts}
          saveItem={saveItem}
          saveSizes={saveSizes}
          onClose={() => setEditingId(null)}
          onDeleted={() => {
            setEditingId(null);
            refresh();
          }}
        />
      )}

      <CategoryManager
        open={managingCategories}
        categories={categories}
        onClose={() => setManagingCategories(false)}
        onChanged={refresh}
      />
    </>
  );
}

function CategoryButton({
  active,
  onClick,
  label,
  count,
  hidden,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  hidden?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="mb-1 flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold"
      style={{
        background: active ? "var(--s-brand-soft)" : "transparent",
        color: active ? "var(--s-brand)" : hidden ? "var(--s-ink-faint)" : "var(--s-ink)",
        boxShadow: active ? "inset 0 0 0 1.5px var(--s-brand)" : undefined,
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{label}</span>
        {hidden && <EyeOff className="h-3.5 w-3.5 shrink-0" aria-label="Hidden" />}
      </span>
      <span className="money text-xs">{count}</span>
    </button>
  );
}

function DishCard({ item, canSeeCosts, onOpen }: { item: AdminMenuItem; canSeeCosts: boolean; onOpen: () => void }) {
  const onSale = item.sizes.filter((size) => size.isAvailable);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="s-card flex min-h-56 flex-col p-3 text-left transition-transform active:scale-[0.99]"
      aria-label={`Edit ${item.name}`}
      style={{ opacity: item.isAvailable ? 1 : 0.7 }}
    >
      <div className="relative mx-auto mt-3 h-24 w-24 overflow-hidden rounded-full bg-[var(--s-panel-alt)]">
        <Image src={item.imageUrl || "/images/menu/servings.jpg"} alt="" fill className="object-cover" sizes="96px" />
      </div>
      <div className="mt-4 min-w-0">
        <p className="text-[10px] font-semibold" style={{ color: "var(--s-ink-faint)" }}>{item.categoryName}</p>
        <p className="line-clamp-2 text-sm font-bold">{item.name}</p>
        <p className="money mt-1 text-sm font-extrabold">
          {onSale.length > 1 ? `from ${formatGHS(item.price)}` : formatGHS(item.price)}
        </p>
        {item.sizes.length > 0 && (
          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--s-ink-muted)" }}>
            {item.sizes.map((size) => size.label).join(" · ")}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {!item.isAvailable && <Chip tone="warn">Off the menu</Chip>}
          {item.isPopular && <Chip tone="good">Popular</Chip>}
          {canSeeCosts && needsCost(item) && <Chip tone="neutral">No cost</Chip>}
        </div>
      </div>
    </button>
  );
}

function AddCategoryForm({ onAdded }: { onAdded: (id: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const result = await send("/api/admin/menu/categories", "POST", { name: trimmed });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    onAdded(String(result.data.id));
  }

  return (
    <form onSubmit={submit} className="mt-auto pt-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="New category"
        maxLength={40}
        className={`${inputClass} mb-2`}
        style={inputStyle}
        aria-label="New category"
      />
      {error && (
        <p className="mb-2 text-xs" style={{ color: "var(--s-bad)" }} role="alert">
          {error}
        </p>
      )}
      <AdminButton type="submit" variant="primary" loading={busy} disabled={!name.trim()} className="w-full">
        Add category
      </AdminButton>
    </form>
  );
}

function slugFor(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "dish"}-${Date.now().toString(36)}`;
}

function AddDishDialog({
  open,
  categories,
  defaultCategory,
  onClose,
  onAdded,
}: {
  open: boolean;
  categories: AdminMenuCategory[];
  defaultCategory: string;
  onClose: () => void;
  onAdded: (categoryId: string) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryId = category || defaultCategory;

  function close() {
    if (busy) return;
    setError(null);
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = parseMoney(price);
    if (!name.trim()) return setError("Give the dish a name.");
    if (value === null || Number.isNaN(value)) return setError("Enter a price, like 45 or 45.50.");
    setBusy(true);
    setError(null);
    const result = await send("/api/admin/menu", "POST", {
      slug: slugFor(name),
      name: name.trim(),
      price: value,
      categoryId,
      isAvailable: true,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setName("");
    setPrice("");
    setCategory("");
    onAdded(categoryId);
  }

  return (
    <Dialog
      open={open}
      title="Add dish"
      description="Sizes, a photo and a description can be added once it is saved."
      onClose={close}
      footer={
        <>
          <AdminButton variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form="add-dish" variant="primary" loading={busy}>
            Save dish
          </AdminButton>
        </>
      }
    >
      <form id="add-dish" onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClass} style={inputStyle} autoFocus />
        </Field>
        <Field label="Price (GH₵)" hint="For a dish with sizes, enter the smallest size's price.">
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className={`${inputClass} money`}
            style={inputStyle}
          />
        </Field>
        <Field label="Category">
          <select value={categoryId} onChange={(event) => setCategory(event.target.value)} className={inputClass} style={inputStyle}>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </Field>
        {error && (
          <p className="text-sm" style={{ color: "var(--s-bad)" }} role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}

type SizeRow = { key: string; id?: string; label: string; price: string; cost: string; isAvailable: boolean };

const money2 = (value: number | null) => (value === null ? "" : value.toFixed(2));

function rowsFrom(sizes: AdminMenuSize[]): SizeRow[] {
  return sizes.map((size) => ({
    key: size.id,
    id: size.id,
    label: size.label,
    price: money2(size.price),
    cost: money2(size.costPrice),
    isAvailable: size.isAvailable,
  }));
}

/** What a size list says, ignoring the keys React uses to track rows. */
const sizeSignature = (rows: SizeRow[]) =>
  JSON.stringify(rows.map((row) => [row.id, row.label, row.price, row.cost, row.isAvailable]));

let rowSeq = 0;
const newRowKey = () => `new-${++rowSeq}`;

/**
 * Everything about one dish in one place. Fields are a draft until "Save
 * changes", so a half-typed price never reaches the till. The photo is the
 * exception: it saves as soon as it uploads.
 */
function EditDishDialog({
  item,
  categories,
  canSeeCosts,
  saveItem,
  saveSizes,
  onClose,
  onDeleted,
}: {
  item: AdminMenuItem;
  categories: AdminMenuCategory[];
  canSeeCosts: boolean;
  saveItem: (id: string, patch: Partial<AdminMenuItem>) => Promise<string | null>;
  saveSizes: (item: AdminMenuItem, sizes: SizeInput[]) => Promise<string | null>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [isPopular, setIsPopular] = useState(item.isPopular);
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [priceText, setPriceText] = useState(money2(item.price));
  const [costText, setCostText] = useState(money2(item.costPrice));
  const [rows, setRows] = useState<SizeRow[]>(() => rowsFrom(item.sizes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasSizes = rows.length > 0;
  const sizesChanged = sizeSignature(rows) !== sizeSignature(rowsFrom(item.sizes));

  function updateRow(key: string, patch: Partial<SizeRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function moveRow(index: number, step: -1 | 1) {
    setRows((current) => {
      const next = [...current];
      const target = index + step;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function startSizes() {
    // Seed with the current price so nothing changes until the cashier edits it.
    const price = parseMoney(priceText);
    const base = price === null || Number.isNaN(price) ? "" : price.toFixed(2);
    setRows([
      { key: newRowKey(), label: "Small", price: base, cost: costText, isAvailable: true },
      { key: newRowKey(), label: "Large", price: "", cost: "", isAvailable: true },
    ]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (!name.trim()) return setError("Give the dish a name.");

    let sizeInputs: SizeInput[] | null = null;
    if (sizesChanged) {
      if (rows.length === 1) return setError("A dish with sizes needs at least two. Add another size, or remove this one.");
      const labels = rows.map((row) => row.label.trim().toLowerCase());
      if (labels.some((label) => !label)) return setError("Name every size, like Small or Large.");
      if (new Set(labels).size !== labels.length) return setError("Two sizes have the same name.");
      sizeInputs = [];
      for (const row of rows) {
        const price = parseMoney(row.price);
        if (price === null || Number.isNaN(price)) return setError(`Enter a price for ${row.label.trim()}.`);
        const cost = parseMoney(row.cost);
        if (Number.isNaN(cost)) return setError(`The cost for ${row.label.trim()} is not a number.`);
        sizeInputs.push({ id: row.id, label: row.label.trim(), price, costPrice: cost, isAvailable: row.isAvailable });
      }
      if (rows.length > 0 && !rows.some((row) => row.isAvailable)) {
        return setError("At least one size must be on sale. To stop selling the dish, take it off the menu instead.");
      }
    }

    const patch: Partial<AdminMenuItem> = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if (description.trim() !== item.description) patch.description = description.trim();
    if (categoryId !== item.categoryId) patch.categoryId = categoryId;
    if (isPopular !== item.isPopular) patch.isPopular = isPopular;
    if (isAvailable !== item.isAvailable) patch.isAvailable = isAvailable;
    if (!hasSizes) {
      const price = parseMoney(priceText);
      if (price === null || Number.isNaN(price)) return setError("Enter a price, like 45 or 45.50.");
      if (price !== item.price) patch.price = price;
      if (canSeeCosts) {
        const cost = parseMoney(costText);
        if (Number.isNaN(cost)) return setError("The cost is not a number.");
        if (cost !== item.costPrice) patch.costPrice = cost;
      }
    }

    setBusy(true);
    // Sizes first: removing every size hands the price back to the dish.
    if (sizeInputs) {
      const failed = await saveSizes(item, sizeInputs);
      if (failed) {
        setBusy(false);
        return setError(failed);
      }
    }
    if (Object.keys(patch).length > 0) {
      const failed = await saveItem(item.id, patch);
      if (failed) {
        setBusy(false);
        return setError(failed);
      }
    }
    setBusy(false);
    onClose();
  }

  async function remove() {
    setDeleting(true);
    const result = await send(`/api/admin/menu/${item.id}`, "DELETE", {});
    setDeleting(false);
    setConfirmDelete(false);
    if (!result.ok) return setError(result.error);
    onDeleted();
  }

  const sold = item.timesSold > 0;

  return (
    <>
      <Dialog
        open
        wide
        title={item.name}
        description={`${item.categoryName}${sold ? ` · sold ${item.timesSold} time${item.timesSold === 1 ? "" : "s"}` : ""}`}
        onClose={() => !busy && onClose()}
        footer={
          <>
            {!sold && (
              <AdminButton variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy} className="mr-auto">
                <Trash2 className="h-4 w-4" /> Delete
              </AdminButton>
            )}
            <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" form="edit-dish" variant="primary" loading={busy}>
              Save changes
            </AdminButton>
          </>
        }
      >
        <form id="edit-dish" onSubmit={submit} className="space-y-4">
          <div className="flex items-start gap-4">
            <ImageControl item={item} save={saveItem} />
            <div className="min-w-0 flex-1 space-y-3">
              <Field label="Name">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClass} style={inputStyle} />
              </Field>
              <Field label="Category">
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass} style={inputStyle}>
                  {categories.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <Field label="Description" hint="Shown on the website under the dish name.">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={2}
              className={`${inputClass} resize-y`}
              style={inputStyle}
            />
          </Field>

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="On the menu" hint="Off hides it from the website and the till." checked={isAvailable} onChange={setIsAvailable} />
            <Toggle label="Popular" hint="Shown first, with a badge, on the website." checked={isPopular} onChange={setIsPopular} />
          </div>

          {!hasSizes && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price (GH₵)">
                <input value={priceText} onChange={(event) => setPriceText(event.target.value)} inputMode="decimal" className={`${inputClass} money`} style={inputStyle} />
              </Field>
              {canSeeCosts && (
                <Field label="Cost to make (GH₵)" hint="Ingredients and packaging for one plate. Leave empty if unknown.">
                  <input value={costText} onChange={(event) => setCostText(event.target.value)} inputMode="decimal" className={`${inputClass} money`} style={inputStyle} />
                </Field>
              )}
            </div>
          )}

          <section className="rounded-2xl p-3" style={{ background: "var(--s-sunk)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold">Sizes</p>
                <p className="text-xs" style={{ color: "var(--s-ink-muted)" }}>
                  {hasSizes
                    ? "The till asks which size; each has its own price and cost."
                    : "Same dish, different portions? Add sizes instead of separate dishes."}
                </p>
              </div>
              {hasSizes ? (
                <AdminButton
                  onClick={() => setRows((current) => [...current, { key: newRowKey(), label: "", price: "", cost: "", isAvailable: true }])}
                  disabled={rows.length >= 8}
                >
                  <Plus className="h-4 w-4" /> Add size
                </AdminButton>
              ) : (
                <AdminButton onClick={startSizes}>
                  <Plus className="h-4 w-4" /> Sell in sizes
                </AdminButton>
              )}
            </div>

            {hasSizes && (
              <ul className="mt-3 space-y-2">
                {rows.map((row, index) => (
                  <li key={row.key} className="rounded-2xl p-2" style={{ background: "var(--s-panel)" }}>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="min-w-28 flex-1">
                        <span className="mb-1 block text-xs" style={{ color: "var(--s-ink-faint)" }}>Size</span>
                        <input
                          value={row.label}
                          onChange={(event) => updateRow(row.key, { label: event.target.value })}
                          placeholder="e.g. Medium"
                          maxLength={30}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </label>
                      <label className="w-28">
                        <span className="mb-1 block text-xs" style={{ color: "var(--s-ink-faint)" }}>Price</span>
                        <input
                          value={row.price}
                          onChange={(event) => updateRow(row.key, { price: event.target.value })}
                          inputMode="decimal"
                          className={`${inputClass} money`}
                          style={inputStyle}
                          aria-label={`Price of ${row.label || "size"}`}
                        />
                      </label>
                      {canSeeCosts && (
                        <label className="w-28">
                          <span className="mb-1 block text-xs" style={{ color: "var(--s-ink-faint)" }}>Cost</span>
                          <input
                            value={row.cost}
                            onChange={(event) => updateRow(row.key, { cost: event.target.value })}
                            inputMode="decimal"
                            placeholder="—"
                            className={`${inputClass} money`}
                            style={inputStyle}
                            aria-label={`Cost of ${row.label || "size"}`}
                          />
                        </label>
                      )}
                      <div className="flex items-center gap-1">
                        <IconButton label="Move up" onClick={() => moveRow(index, -1)} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Move down" onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Remove ${row.label || "size"}`} onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--s-ink-muted)" }}>
                      <input
                        type="checkbox"
                        checked={row.isAvailable}
                        onChange={(event) => updateRow(row.key, { isAvailable: event.target.checked })}
                        className="h-4 w-4"
                      />
                      On sale
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {hasSizes && rows.length === 1 && (
              <p className="mt-2 text-xs" style={{ color: "var(--s-warn)" }}>
                Add a second size, or remove this one to go back to a single price.
              </p>
            )}
          </section>

          {sold && (
            <p className="text-xs" style={{ color: "var(--s-ink-muted)" }}>
              This dish is on past receipts, so it cannot be deleted. Switch off <strong>On the menu</strong> to stop selling it;
              the reports stay correct.
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 text-sm" style={{ color: "var(--s-bad)" }} role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${item.name}?`}
        message="It has never been sold, so nothing else changes. This cannot be undone."
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 rounded-2xl border p-3 text-left"
      style={{ borderColor: checked ? "var(--s-brand)" : "var(--s-border)", background: checked ? "var(--s-brand-soft)" : "var(--s-panel)" }}
    >
      <span
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--s-brand)" : "var(--s-border)" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? "1.125rem" : "0.125rem" }}
        />
      </span>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs" style={{ color: "var(--s-ink-muted)" }}>{hint}</span>
      </span>
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-xl disabled:opacity-30"
      style={{ color: "var(--s-ink-muted)" }}
    >
      {children}
    </button>
  );
}

/** Rename, reorder, hide and delete categories. Each change saves at once. */
function CategoryManager({
  open,
  categories,
  onClose,
  onChanged,
}: {
  open: boolean;
  categories: AdminMenuCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<AdminMenuCategory | null>(null);

  async function run(id: string, request: Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusyId(id);
    setError(null);
    const result = await request;
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    onChanged();
    return true;
  }

  async function rename(category: AdminMenuCategory) {
    const name = (names[category.id] ?? category.name).trim();
    if (!name) {
      setNames((current) => ({ ...current, [category.id]: category.name }));
      return;
    }
    if (name === category.name) return;
    await run(category.id, send("/api/admin/menu/categories", "PATCH", { id: category.id, name }));
  }

  async function move(index: number, step: -1 | 1) {
    const ordered = [...categories];
    const target = index + step;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    // Renumber the lot, so categories that share a number still end up in order.
    const changed = ordered
      .map((category, position) => ({ category, position }))
      .filter(({ category, position }) => category.sortOrder !== position);
    await run(
      ordered[target].id,
      (async () => {
        for (const { category, position } of changed) {
          const result = await send("/api/admin/menu/categories", "PATCH", { id: category.id, sortOrder: position });
          if (!result.ok) return result;
        }
        return { ok: true as const };
      })(),
    );
  }

  return (
    <>
      <Dialog
        open={open}
        wide
        title="Categories"
        description="The order here is the order on the website and the till. Hidden categories keep their dishes but show nowhere."
        onClose={onClose}
        footer={<AdminButton onClick={onClose}>Done</AdminButton>}
      >
        <ul className="space-y-2">
          {categories.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-2 rounded-2xl p-2" style={{ background: "var(--s-sunk)" }}>
              <input
                value={names[category.id] ?? category.name}
                onChange={(event) => setNames((current) => ({ ...current, [category.id]: event.target.value }))}
                onBlur={() => rename(category)}
                onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                maxLength={40}
                className={`${inputClass} min-w-40 flex-1`}
                style={inputStyle}
                aria-label={`Name of ${category.name}`}
              />
              <span className="money w-16 text-xs" style={{ color: "var(--s-ink-muted)" }}>
                {category.count} dish{category.count === 1 ? "" : "es"}
              </span>
              <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0 || busyId !== null}>
                <ArrowUp className="h-4 w-4" />
              </IconButton>
              <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === categories.length - 1 || busyId !== null}>
                <ArrowDown className="h-4 w-4" />
              </IconButton>
              <AdminButton
                variant={category.isActive ? "secondary" : "primary"}
                onClick={() => run(category.id, send("/api/admin/menu/categories", "PATCH", { id: category.id, isActive: !category.isActive }))}
                loading={busyId === category.id}
                aria-pressed={!category.isActive}
                className="!min-h-10 px-3"
              >
                {category.isActive ? "Hide" : "Show"}
              </AdminButton>
              <IconButton
                label={category.count > 0 ? "Move its dishes out first to delete" : `Delete ${category.name}`}
                onClick={() => setDeleting(category)}
                disabled={category.count > 0 || busyId !== null}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--s-bad)" }} role="alert">
            {error}
          </p>
        )}
        <p className="mt-3 text-xs" style={{ color: "var(--s-ink-faint)" }}>
          Only an empty category can be deleted. Move its dishes to another category first, from each dish&rsquo;s edit screen.
        </p>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? "category"}?`}
        message="It has no dishes, so nothing else changes."
        busy={busyId === deleting?.id}
        onConfirm={async () => {
          if (!deleting) return;
          await run(deleting.id, send("/api/admin/menu/categories", "DELETE", { id: deleting.id }));
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
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
  save: (id: string, patch: Partial<AdminMenuItem>) => Promise<string | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = preview ?? item.imageUrl;

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after a failure
    if (!file) return;

    setError(null);
    setBusy(true);
    setPreview(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not upload that image.");
        setPreview(null);
        return;
      }
      const failed = await save(item.id, { imageUrl: data.url });
      if (failed) {
        setError(failed);
        setPreview(null);
      }
    } catch {
      setError("No connection.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-24 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border"
        style={{ background: "var(--s-panel-alt)", borderColor: error ? "var(--s-bad)" : "var(--s-border)" }}
        aria-label={shown ? `Change photo for ${item.name}` : `Add a photo for ${item.name}`}
      >
        {shown ? (
          <Image src={shown} alt="" width={96} height={96} className="h-full w-full object-cover" unoptimized={!!preview} />
        ) : (
          <ImagePlus className="h-6 w-6" style={{ color: "var(--s-ink-faint)" }} />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center" style={{ background: "rgba(0,0,0,0.4)" }}>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <p className="mt-1 text-center text-[0.65rem] leading-tight" style={{ color: error ? "var(--s-bad)" : "var(--s-ink-faint)" }}>
        {error ?? "Tap to change. Saves straight away."}
      </p>
    </div>
  );
}

/** Food cost as a share of price. Most kitchens aim for 28–35%. */
function foodCostTone(share: number): "good" | "warn" | "bad" {
  if (share <= 35) return "good";
  if (share <= 45) return "warn";
  return "bad";
}

/** One line of the costing sheet: a dish, or one size of a dish. */
type CostLine = {
  key: string;
  item: AdminMenuItem;
  size: AdminMenuSize | null;
  price: number;
  costPrice: number | null;
  sold30: number;
  revenue30: number;
  available: boolean;
};

/**
 * Every dish in one sheet, best sellers first, with price and cost editable in
 * place. Built for an afternoon of costing: tab down the Cost column, and each
 * figure saves as you leave the field. A dish with sizes gets a line per size,
 * because a large plate costs more to make than a small one.
 */
function CostingTable({
  items,
  saveItem,
  saveSizes,
  saves,
  onOpen,
}: {
  items: AdminMenuItem[];
  saveItem: (id: string, patch: Partial<AdminMenuItem>) => Promise<string | null>;
  saveSizes: (item: AdminMenuItem, sizes: SizeInput[]) => Promise<string | null>;
  saves: Record<string, SaveState>;
  onOpen: (id: string) => void;
}) {
  const lines = items.flatMap<CostLine>((item) =>
    item.sizes.length > 0
      ? item.sizes.map((size) => ({
          key: `${item.id}:${size.id}`,
          item,
          size,
          price: size.price,
          costPrice: size.costPrice,
          sold30: size.sold30,
          revenue30: size.revenue30,
          available: item.isAvailable && size.isAvailable,
        }))
      : [
          {
            key: item.id,
            item,
            size: null,
            price: item.price,
            costPrice: item.costPrice,
            sold30: item.sold30,
            revenue30: item.revenue30,
            available: item.isAvailable,
          },
        ],
  );
  const sorted = [...lines].sort(
    (a, b) => b.item.revenue30 - a.item.revenue30 || a.item.name.localeCompare(b.item.name) || b.revenue30 - a.revenue30,
  );
  const totalRevenue = lines.reduce((sum, line) => sum + line.revenue30, 0);
  const covered = lines.filter((line) => line.costPrice !== null).reduce((sum, line) => sum + line.revenue30, 0);

  function saveLine(line: CostLine, field: "price" | "costPrice", value: number | null) {
    if (!line.size) return saveItem(line.item.id, { [field]: value });
    return saveSizes(
      line.item,
      line.item.sizes.map((size) => ({
        id: size.id,
        label: size.label,
        price: size.id === line.size!.id && field === "price" ? (value ?? size.price) : size.price,
        costPrice: size.id === line.size!.id && field === "costPrice" ? value : size.costPrice,
        isAvailable: size.isAvailable,
      })),
    );
  }

  return (
    <Panel
      title="Dish costing"
      explainer={
        <>
          What each plate costs to make: ingredients, packaging, gas. Best sellers first, one line per size. Each figure
          saves when you leave the box.{" "}
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
            {sorted.map((line) => (
              <CostingRow
                key={`${line.key}:${line.price}:${line.costPrice}`}
                line={line}
                save={(field, value) => saveLine(line, field, value)}
                state={saves[line.item.id]}
                onOpen={() => onOpen(line.item.id)}
              />
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function CostingRow({
  line,
  save,
  state,
  onOpen,
}: {
  line: CostLine;
  save: (field: "price" | "costPrice", value: number | null) => Promise<string | null>;
  state?: SaveState;
  onOpen: () => void;
}) {
  const [priceText, setPriceText] = useState(money2(line.price));
  const [costText, setCostText] = useState(money2(line.costPrice));
  const label = line.size ? `${line.item.name} (${line.size.label})` : line.item.name;

  function commit(text: string, current: number | null, field: "price" | "costPrice", reset: (value: string) => void) {
    const value = parseMoney(text);
    if (Number.isNaN(value) || (field === "price" && value === null)) {
      reset(money2(current));
      return;
    }
    reset(money2(value));
    if (value !== current) {
      void save(field, value).then((failed) => failed && reset(money2(current)));
    }
  }

  // Live from what is typed, so the margin answers "what if" before saving.
  const price = Number(priceText) || 0;
  const cost = costText.trim() === "" ? null : Number(costText);
  const share = cost !== null && Number.isFinite(cost) && price > 0 ? (cost / price) * 100 : null;
  const kept = share !== null ? price - (cost ?? 0) : null;

  const field = "money w-24 rounded-xl border px-2.5 py-1.5 text-right outline-none focus:ring-2 !min-h-10";

  return (
    <tr style={{ opacity: line.available ? 1 : 0.6 }}>
      <td>
        <button type="button" onClick={onOpen} className="text-left !min-h-0">
          <span className="block font-semibold">
            {line.item.name}
            {line.size && <span style={{ color: "var(--s-brand)" }}> · {line.size.label}</span>}
          </span>
          <span className="block text-xs" style={{ color: "var(--s-ink-faint)" }}>
            {line.item.categoryName}
            {!line.available && " · not on sale"}
          </span>
        </button>
      </td>
      <td className="num muted">
        {line.sold30 > 0 ? (
          <>
            {line.sold30}
            <span className="block text-xs">{formatGHS(line.revenue30)}</span>
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
          onBlur={() => commit(priceText, line.price, "price", setPriceText)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className={field}
          style={inputStyle}
          aria-label={`Price of ${label}`}
        />
      </td>
      <td className="num">
        <input
          inputMode="decimal"
          value={costText}
          placeholder="Add"
          onChange={(event) => setCostText(event.target.value)}
          onBlur={() => commit(costText, line.costPrice, "costPrice", setCostText)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className={field}
          style={{ ...inputStyle, ...(line.costPrice === null ? { borderColor: "var(--s-warn)" } : {}) }}
          aria-label={`Cost of ${label}`}
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
