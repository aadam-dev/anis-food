"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Check, Loader2, AlertCircle, ImagePlus } from "lucide-react";
import { formatGHS, roundMoney } from "@/lib/money";
import {
  PageHeader,
  Panel,
  EmptyState,
  Chip,
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
}

interface Props {
  categories: AdminMenuCategory[];
  items: AdminMenuItem[];
  canSeeCosts: boolean;
}

type SaveState = { id: string; status: "saving" | "saved" | "error"; message?: string };

export default function MenuManagerClient({ categories, items, canSeeCosts }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle)
      );
    });
  }, [merged, search, categoryFilter]);

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

  return (
    <>
      <PageHeader
        title="Menu"
        description="What you change here is what the website shows and what the till charges."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
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
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className={inputClass}
          style={inputStyle}
          aria-label="Filter by category"
        >
          <option value="all">All categories ({merged.length})</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Chip>{merged.length} dishes</Chip>
        {unavailableCount > 0 && <Chip tone="warn">{unavailableCount} sold out</Chip>}
        {canSeeCosts && (
          <Chip tone={costCoverage === merged.length ? "good" : "neutral"}>
            Cost price on {costCoverage} of {merged.length}
          </Chip>
        )}
      </div>

      <Panel>
        {visible.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            hint="Try a different search or category."
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {visible.map((item) => (
              <MenuRow
                key={item.id}
                item={item}
                canSeeCosts={canSeeCosts}
                save={save}
                state={saves[item.id]}
              />
            ))}
          </ul>
        )}
      </Panel>
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
                className="money w-24 rounded-lg border px-2.5 py-2 text-right outline-none focus:ring-2"
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
                  className="money w-24 rounded-lg border px-2.5 py-2 text-right outline-none focus:ring-2"
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
