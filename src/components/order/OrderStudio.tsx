"use client";

/**
 * Self-service ordering, laid out like the till: the menu on the left, the
 * order building up on the right (a bar and sheet on phones), and checkout in
 * the same place. Orders go straight to the restaurant's till, where a cashier
 * is alerted until they accept it. WhatsApp is optional, never required.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  X,
} from "lucide-react";
import Receipt, { type ReceiptData } from "@/components/order/Receipt";
import { useCart, cartLineKey } from "@/contexts/CartContext";
import { BUSINESS_INFO, ORDER_CONFIG } from "@/lib/constants";
import type { SerializedMenuCategory, SerializedMenuItem } from "@/lib/menu-data";
import { cn, formatPrice, getOrderTotals, validateOrderPhone } from "@/lib/utils";
import type { DietaryTag, MenuItem, OrderItem } from "@/types";

const LAST_ORDER_KEY = "anis_last_order";
const FALLBACK_IMAGE = "/images/menu/jollof-chicken-serving.jpg";

type Fulfilment = "delivery" | "pickup";
type Size = SerializedMenuItem["sizes"][number];

function toMenuItem(item: SerializedMenuItem): MenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    category: item.categorySlug as MenuItem["category"],
    image: item.imageUrl ?? undefined,
    popular: item.popular,
    available: item.available,
    tags: item.tags as DietaryTag[],
    sizes: item.sizes,
  };
}

function newClientRef(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function OrderStudio({
  categories,
  items,
}: {
  categories: SerializedMenuCategory[];
  items: SerializedMenuItem[];
}) {
  const cart = useCart();
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [placed, setPlaced] = useState<ReceiptData | null>(null);

  // A refresh after ordering still shows the confirmation and receipt.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ReceiptData;
      if (saved?.orderRef && Array.isArray(saved.items)) {
        const timer = window.setTimeout(() => setPlaced(saved), 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      /* Nothing saved, or storage blocked. */
    }
  }, []);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (needle) {
        return (
          item.name.toLowerCase().includes(needle) || (item.description ?? "").toLowerCase().includes(needle)
        );
      }
      if (category === "popular") return item.popular;
      return category === "all" || item.categorySlug === category;
    });
  }, [items, category, search]);

  const quantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart.items) map.set(cartLineKey(line), line.quantity);
    return map;
  }, [cart.items]);

  const total = cart.items.reduce((sum, line) => sum + line.menuItem.price * line.quantity, 0);

  function add(item: SerializedMenuItem, size?: Size) {
    cart.addItem(toMenuItem(item), 1, size);
  }

  function step(item: SerializedMenuItem, size: Size | undefined, change: 1 | -1) {
    const key = cartLineKey({ menuItem: { id: item.id }, size });
    const current = quantities.get(key) ?? 0;
    if (change === 1 && current === 0) return add(item, size);
    cart.updateQuantity(key, current + change);
  }

  function finish(receipt: ReceiptData) {
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(receipt));
    } catch {
      /* Storage blocked: the confirmation still shows now. */
    }
    cart.clearCart();
    setSheetOpen(false);
    setPlaced(receipt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startOver() {
    try {
      sessionStorage.removeItem(LAST_ORDER_KEY);
    } catch {
      /* ignore */
    }
    setPlaced(null);
  }

  if (placed) return <Confirmation receipt={placed} onNewOrder={startOver} />;

  const chips = [
    { id: "all", name: "All" },
    ...(items.some((item) => item.popular) ? [{ id: "popular", name: "Popular" }] : []),
    ...categories.map((entry) => ({ id: entry.slug, name: entry.name })),
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28 lg:pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl text-gray-900 md:text-5xl">Order online</h1>
            <p className="mt-1 text-gray-600">
              Tap to add. Your order goes straight to our kitchen; pay on pickup or delivery.
            </p>
          </div>
          <a
            href={BUSINESS_INFO.deliveryPlatforms.boltFood}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-600 underline hover:text-primary-red"
          >
            Prefer Bolt Food?
          </a>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_25rem] lg:items-start">
          <section className="min-w-0">
            <div className="sticky top-16 z-10 -mx-4 mb-5 space-y-3 bg-[#FAF7F2]/95 px-4 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              <label className="relative block">
                <span className="sr-only">Search the menu</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search dishes"
                  className="w-full rounded-full border border-gray-200 bg-white py-3 pl-12 pr-4 text-base outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </label>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Menu sections">
                {chips.map((chip) => {
                  const active = !search && category === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setSearch("");
                        setCategory(chip.id);
                      }}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                        active
                          ? "bg-gray-900 text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:border-gray-400",
                      )}
                    >
                      {chip.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
                No dish matches that. Try another word or section.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((item) => (
                  <DishTile key={item.id} item={item} quantities={quantities} onStep={step} />
                ))}
              </ul>
            )}
          </section>

          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <OrderPanel onPlaced={finish} />
          </aside>
        </div>
      </div>

      {/* Phones: the order lives in a bar that opens into a sheet. */}
      {cart.count > 0 && !sheetOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex w-full items-center justify-between rounded-full bg-gray-900 px-6 py-4 text-left font-bold text-white shadow-xl"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {cart.count} item{cart.count === 1 ? "" : "s"}
            </span>
            <span>My order · {formatPrice(total)}</span>
          </button>
        </div>
      )}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40 lg:hidden" role="dialog" aria-modal="true" aria-label="Your order">
          <button type="button" className="h-16 shrink-0" onClick={() => setSheetOpen(false)} aria-label="Close" />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.75rem] bg-white">
            <div className="flex justify-end px-4 pt-3">
              <button type="button" onClick={() => setSheetOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <OrderPanel onPlaced={finish} flat />
          </div>
        </div>
      )}
    </div>
  );
}

function DishTile({
  item,
  quantities,
  onStep,
}: {
  item: SerializedMenuItem;
  quantities: Map<string, number>;
  onStep: (item: SerializedMenuItem, size: Size | undefined, change: 1 | -1) => void;
}) {
  const [sizeId, setSizeId] = useState(item.sizes[0]?.id);
  // A dish down to one size on sale is that size, with no choice to make.
  const size = item.sizes.find((entry) => entry.id === sizeId) ?? item.sizes[0];
  const choosing = item.sizes.length > 1;
  const key = cartLineKey({ menuItem: { id: item.id }, size });
  const quantity = quantities.get(key) ?? 0;
  const price = size?.price ?? item.price;
  const label = choosing && size ? `${item.name}, ${size.label}` : item.name;

  return (
    <li className="flex flex-col rounded-[1.75rem] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="relative aspect-[2/1] overflow-hidden rounded-[1.25rem] bg-gray-100 sm:aspect-[4/3]">
        <Image src={item.imageUrl || FALLBACK_IMAGE} alt="" fill sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 90vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
        <span className="absolute left-4 top-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
          {item.categoryName}
        </span>
        {item.popular && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-gray-900">Popular</span>
        )}
        <p className="absolute inset-x-4 bottom-3 line-clamp-2 font-display text-xl leading-tight text-white">{item.name}</p>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-1 pt-3">
        {item.description && <p className="line-clamp-2 text-sm text-gray-500">{item.description}</p>}
        {choosing && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Size of ${item.name}`}>
            {item.sizes.map((entry) => {
              const active = entry.id === size?.id;
              const inCart = quantities.get(cartLineKey({ menuItem: { id: item.id }, size: entry })) ?? 0;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSizeId(entry.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                    active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400",
                  )}
                >
                  {entry.label}
                  {inCart > 0 && <span className={cn("ml-1.5 tabular-nums", active ? "text-white/70" : "text-primary-red-ui")}>×{inCart}</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="whitespace-nowrap font-display text-xl tabular-nums text-gray-900 xl:text-2xl">{formatPrice(price)}</span>
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => onStep(item, size, 1)}
              className="grid h-12 w-12 place-items-center rounded-full bg-primary-red-ui text-white shadow-sm transition-transform hover:bg-primary-red-dark active:scale-95"
              aria-label={`Add ${label}`}
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : (
            <Stepper quantity={quantity} name={label} onLess={() => onStep(item, size, -1)} onMore={() => onStep(item, size, 1)} />
          )}
        </div>
      </div>
    </li>
  );
}

function Stepper({
  quantity,
  name,
  onLess,
  onMore,
  large,
}: {
  quantity: number;
  name: string;
  onLess: () => void;
  onMore: () => void;
  large?: boolean;
}) {
  const button = cn("grid place-items-center rounded-full hover:bg-white", large ? "h-10 w-10" : "h-8 w-8");
  return (
    <div className={cn("inline-flex items-center rounded-full bg-gray-100", large ? "p-1" : "p-0.5")}>
      <button type="button" onClick={onLess} className={button} aria-label={`One less ${name}`}>
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn("text-center font-bold tabular-nums", large ? "min-w-8" : "min-w-6 text-sm")} aria-live="polite">
        {quantity}
      </span>
      <button type="button" onClick={onMore} className={button} aria-label={`One more ${name}`}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * "My order": the lines so far and one button to check out, then the customer's
 * details in the same panel. The same panel on a desk and in the phone sheet.
 */
function OrderPanel({ onPlaced, flat }: { onPlaced: (receipt: ReceiptData) => void; flat?: boolean }) {
  const cart = useCart();
  const [stage, setStage] = useState<"order" | "details">("order");
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // One reference per attempt: a retry after a dropped connection can never
  // create the same order twice.
  const clientRef = useRef<string | null>(null);

  const totals = getOrderTotals(
    cart.items.map((line) => ({ price: line.menuItem.price, quantity: line.quantity })),
    ORDER_CONFIG.VAT_RATE,
    ORDER_CONFIG.VAT_INCLUSIVE,
  );
  const empty = cart.items.length === 0;
  const showDetails = stage === "details" && !empty;

  async function place(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || empty) return;
    const problems: Record<string, string> = {};
    if (!name.trim()) problems.name = "Your name, so we know whose order it is.";
    const phoneCheck = validateOrderPhone(phone);
    if (phoneCheck !== true) problems.phone = phoneCheck;
    if (fulfilment === "delivery" && !address.trim()) problems.address = "Where should we deliver? Area and a landmark.";
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    setFailure(null);
    clientRef.current ??= newClientRef();
    const lines: OrderItem[] = cart.items.map((line) => ({ ...line }));
    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRef: clientRef.current,
          deliveryType: fulfilment,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: fulfilment === "delivery" ? address.trim() : undefined,
          notes: notes.trim() || undefined,
          lines: lines.map((line) => ({ menuItemId: line.menuItem.id, sizeId: line.size?.id, quantity: line.quantity })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        order?: { orderNumber: string; total: number };
      };
      if (!response.ok || !payload.order) {
        // Refused (a dish sold out, a price changed): a new attempt needs a new reference.
        if (response.status < 500) clientRef.current = null;
        setFailure(
          response.status < 500 && payload.error
            ? `${payload.error} Remove it from your order, or refresh the page for today's menu.`
            : "We could not place the order. Please try again.",
        );
        return;
      }
      clientRef.current = null;
      onPlaced({
        orderRef: payload.order.orderNumber,
        items: lines,
        totals: { ...totals, total: payload.order.total },
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryType: fulfilment,
        address: fulfilment === "delivery" ? address.trim() : "Pickup at the restaurant",
        paymentMethod: "pay_on_pickup",
        notes: notes.trim() || undefined,
        placedAt: new Date().toISOString(),
      });
    } catch {
      // Network trouble: keep the same reference so retrying cannot double the order.
      setFailure("Your connection dropped before we could confirm. Tap Place order again; it will not be sent twice.");
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-base outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

  return (
    <div className={cn("flex flex-col", !flat && "max-h-[calc(100dvh-7rem)] rounded-[1.75rem] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.15)]")}>
      <div className="border-b border-gray-100 px-6 pb-4 pt-6">
        {showDetails ? (
          <button type="button" onClick={() => setStage("order")} className="mb-1 text-sm font-semibold text-gray-500 hover:text-gray-900">
            ← Back to my order
          </button>
        ) : null}
        <p className="font-display text-3xl text-gray-900">{showDetails ? "Your details" : "My order"}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {cart.count} item{cart.count === 1 ? "" : "s"}
          {showDetails && ` · ${formatPrice(totals.total)}`}
        </p>
      </div>

      {empty ? (
        <div className="px-6 py-12 text-center text-gray-500">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          Tap <b>+</b> on a dish to start your order.
        </div>
      ) : showDetails ? (
        <form onSubmit={place} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Delivery or pickup">
              {(
                [
                  ["delivery", "Delivery", MapPin],
                  ["pickup", "Pickup", Store],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={fulfilment === value}
                  onClick={() => setFulfilment(value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold",
                    fulfilment === value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <Labelled label="Name" error={errors.name}>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={field} />
            </Labelled>
            <Labelled label="Phone" error={errors.phone}>
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="e.g. 050 160 0160" className={field} />
            </Labelled>
            {fulfilment === "delivery" && (
              <Labelled label="Delivery address" error={errors.address}>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  autoComplete="street-address"
                  placeholder="Area + landmark (e.g. Madina, near the market)"
                  className={field}
                />
              </Labelled>
            )}
            <Labelled label="Notes (optional)">
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Allergies, spice level, gate colour…" className={cn(field, "resize-none")} />
            </Labelled>
          </div>
          <div className="border-t border-gray-100 px-6 pb-6 pt-4">
            {failure && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {failure} Or call us on{" "}
                <a href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`} className="font-bold underline">
                  {BUSINESS_INFO.phone}
                </a>
                .
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-red-ui py-4 text-base font-bold text-white hover:bg-primary-red-dark disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {submitting ? "Placing your order…" : `Place order · ${formatPrice(totals.total)}`}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Pay on {fulfilment === "delivery" ? "delivery" : "pickup"}: cash, MoMo or card.
            </p>
          </div>
        </form>
      ) : (
        <>
          <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {cart.items.map((line) => {
              const key = cartLineKey(line);
              return (
                <li key={key} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                    <Image src={line.menuItem.image || FALLBACK_IMAGE} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[15px] font-semibold leading-snug text-gray-900">{line.menuItem.name}</p>
                      <p className="shrink-0 whitespace-nowrap text-[15px] font-semibold tabular-nums">{formatPrice(line.menuItem.price * line.quantity)}</p>
                    </div>
                    <p className="text-sm tabular-nums text-gray-500">{formatPrice(line.menuItem.price)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Stepper
                        quantity={line.quantity}
                        name={line.menuItem.name}
                        onLess={() => cart.updateQuantity(key, line.quantity - 1)}
                        onMore={() => cart.updateQuantity(key, line.quantity + 1)}
                      />
                      <button
                        type="button"
                        onClick={() => cart.removeItem(key)}
                        className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-red-50 hover:text-primary-red-ui"
                        aria-label={`Remove ${line.menuItem.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-100 px-6 pb-6 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-display text-3xl tabular-nums text-gray-900">{formatPrice(totals.total)}</span>
            </div>
            <p className="mb-4 mt-2 text-sm text-gray-500">Delivery or pickup. You pay when it reaches you.</p>
            <button
              type="button"
              onClick={() => setStage("details")}
              className="w-full rounded-full bg-primary-red-ui py-4 text-base font-bold text-white hover:bg-primary-red-dark"
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Labelled({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

function Confirmation({ receipt, onNewOrder }: { receipt: ReceiptData; onNewOrder: () => void }) {
  const call = receipt.orderRef.split("-").pop()?.replace(/^0+/, "") || receipt.orderRef;
  const whatsapp = `https://wa.me/${BUSINESS_INFO.phoneSecondary.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi Anis, I just placed order ${receipt.orderRef} on your website.`,
  )}`;
  return (
    <div className="min-h-screen bg-[#F9FAFB] py-10">
      <div className="mx-auto max-w-2xl space-y-5 px-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-600" />
          <h1 className="display-font text-2xl font-bold text-gray-900 md:text-3xl">We have your order</h1>
          <p className="mt-2 text-gray-600">
            It is on our till now and the kitchen starts as soon as it is accepted.{" "}
            {receipt.deliveryType === "delivery" ? "We will call before delivery." : "We will call when it is ready to collect."}
          </p>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Order number</p>
          <p className="text-6xl font-extrabold tabular-nums text-primary-red">{call}</p>
          <p className="mt-1 text-sm text-gray-500">{receipt.orderRef}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a
              href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 px-5 py-3 font-bold text-gray-800"
            >
              <Phone className="h-4 w-4" /> Call us
            </a>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366] px-5 py-3 font-bold text-[#128C4B]"
            >
              <MessageCircle className="h-4 w-4" /> Message us on WhatsApp
            </a>
          </div>
          <p className="mt-2 text-xs text-gray-500">Only if you have a question. No need to send the order again.</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <Receipt data={receipt} compact />
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 py-3 font-bold text-gray-800"
          >
            <Printer className="h-4 w-4" /> Print or save receipt
          </button>
        </div>

        <button
          type="button"
          onClick={onNewOrder}
          className="w-full rounded-2xl bg-primary-red py-4 font-bold text-white hover:bg-red-700"
        >
          Start a new order
        </button>
      </div>
    </div>
  );
}
