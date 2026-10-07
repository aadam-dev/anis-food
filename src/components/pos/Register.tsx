"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  CircleAlert,
  CloudOff,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Receipt,
  ReceiptText,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";
import AnisLogo from "@/components/brand/AnisLogo";
import { computeOrderTotals, formatGHS } from "@/lib/money";
import {
  enqueue,
  onReconnect,
  syncPending,
  subscribeQueue,
  getQueueCount,
  getServerQueueCount,
} from "@/lib/offlineQueue";
import { cartReducer, emptyCart, cartCount, lineKey } from "./cartReducer";
import OnlineOrderAlert from "./OnlineOrderAlert";
import SizePickerSheet from "./SizePickerSheet";
import MenuGrid from "./MenuGrid";
import CartPanel from "./CartPanel";
import MobileCartSheet from "./MobileCartSheet";
import PaymentSheet from "./PaymentSheet";
import ShiftPanel, { OpenShiftCard } from "./ShiftPanel";
import { SettleSheet, VoidSheet } from "./OpenTickets";
import OrderDesk from "./OrderDesk";
import EditOrderSheet from "./EditOrderSheet";
import ReceiptModal from "./ReceiptModal";
import QuantityEntrySheet from "./QuantityEntrySheet";
import CashMovementDialog from "./CashMovementDialog";
import CloseShiftDialog from "./CloseShiftDialog";
import XReportSheet from "./XReportSheet";
import CashierSwitchSheet from "./CashierSwitchSheet";
import FullscreenToggle from "./FullscreenToggle";
import { staffAvatarTint, staffInitials } from "@/lib/staff-avatar";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import type { FulfillmentType } from "./CustomerFields";
import Button from "./ui/Button";
import type {
  PosMenuSize,
  CartLine,
  OrderView,
  PosCategory,
  PosMenuItem,
  SessionView,
  PaymentChoice,
} from "./types";

type View = "register" | "tickets" | "shift";
type Gate = "none" | "stale" | "active" | "error";

interface ExpenseCategoryOption {
  id: string;
  name: string;
}

interface RegisterProps {
  user: { id: string; name: string; role: string };
  business: {
    header: string;
    address: string;
    phone: string;
    footer: string;
    taxLabel: string;
  };
  defaultOpeningFloat: number;
  initialSession: SessionView | null;
  initialCategories: PosCategory[];
  initialItems: PosMenuItem[];
  initialTickets: OrderView[];
  expenseCategories?: ExpenseCategoryOption[];
  canFileExpense?: boolean;
  canVoid?: boolean;
  /** Owner / manager: may change an order that has already been paid. */
  canEditPaid?: boolean;
  /** Set for roles that may use the back office. */
  backOfficeHref?: string;
}

export default function Register({
  user,
  business,
  defaultOpeningFloat,
  initialSession,
  initialCategories,
  initialItems,
  initialTickets,
  expenseCategories = [],
  canFileExpense = false,
  canVoid = false,
  canEditPaid = false,
  backOfficeHref,
}: RegisterProps) {
  const router = useRouter();
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);
  // Seeded from the server render, so the till is usable on first paint.
  const [menu, setMenu] = useState<{ categories: PosCategory[]; items: PosMenuItem[] }>({
    categories: initialCategories,
    items: initialItems,
  });
  const [session, setSession] = useState<SessionView | null>(initialSession);
  const [gate, setGate] = useState<Gate>(
    !initialSession ? "none" : initialSession.isStale ? "stale" : "active",
  );
  const [view, setView] = useState<View>(initialSession?.isStale ? "tickets" : "register");
  const [tickets, setTickets] = useState<OrderView[]>(initialTickets);
  const [shiftOrders, setShiftOrders] = useState<OrderView[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chargeIds, setChargeIds] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<OrderView | null>(null);
  const [paying, setPaying] = useState(false);
  // Phone only: the cart lives in a slide-up sheet, since there's no room for a
  // side rail. Desktop shows CartPanel inline and never opens this.
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<OrderView | null>(null);
  const [slipKind, setSlipKind] = useState<"receipt" | "invoice">("receipt");
  const [xReportOpen, setXReportOpen] = useState(false);
  const [online, setOnline] = useState(true);
  // Reads straight from the queue store, so no effect has to set it.
  const queued = useSyncExternalStore(subscribeQueue, getQueueCount, getServerQueueCount);
  const [banner, setBanner] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(user);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("TAKEAWAY");
  const [settling, setSettling] = useState<OrderView | null>(null);
  const [voiding, setVoiding] = useState<OrderView | null>(null);
  // Bound to the session id so a freshly opened shift never inherits a leftover
  // "closing" flag from the shift that just finished.
  const [closingId, setClosingId] = useState<string | null>(null);
  const [movingCash, setMovingCash] = useState(false);
  const [focusedMenuItemId, setFocusedMenuItemId] = useState<string | null>(null);
  const [qtyTarget, setQtyTarget] = useState<CartLine | null>(null);
  const [sizeFor, setSizeFor] = useState<PosMenuItem | null>(null);
  const [tableId, setTableId] = useState("");
  const [tables, setTables] = useState<
    { id: string; label: string; area: string; seats: number; occupied: boolean }[]
  >([]);
  const cartKey = useRef(`anis-pos-cart:${user.id}`);
  const skipSave = useRef(true);

  const locked = gate === "stale";

  const totals = useMemo(
    () =>
      computeOrderTotals({
        lines: cart.lines.map((line) => ({
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
        discountAmount: cart.discount,
      }),
    [cart],
  );

  const chargingLines = useMemo(() => {
    if (!chargeIds) return cart.lines;
    const keep = new Set(chargeIds);
    return cart.lines.filter((line) => keep.has(line.key));
  }, [cart.lines, chargeIds]);

  const chargingTotals = useMemo(() => {
    const partial = chargeIds !== null && chargeIds.length < cart.lines.length;
    return computeOrderTotals({
      lines: chargingLines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
      discountAmount: partial ? 0 : cart.discount,
    });
  }, [chargingLines, chargeIds, cart.lines.length, cart.discount]);

  const selectedTotal = useMemo(() => {
    if (selectedIds.length === 0 || selectedIds.length >= cart.lines.length) return null;
    const keep = new Set(selectedIds);
    return computeOrderTotals({
      lines: cart.lines
        .filter((line) => keep.has(line.key))
        .map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    }).total;
  }, [selectedIds, cart.lines]);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch("/api/pos/sessions");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) throw new Error("session load failed");
      const data = await response.json();
      if (!data.session) {
        setSession(null);
        setGate("none");
      } else {
        setSession(data.session);
        setGate(data.session.isStale ? "stale" : "active");
      }
    } catch {
      // Keep the last good shift on screen rather than dropping the cashier to
      // an "open the till" card they cannot use while a shift is open.
      setGate((current) => (current === "none" ? "error" : current));
    }
  }, [router]);

  const loadMenu = useCallback(async () => {
    try {
      const response = await fetch("/api/pos/menu");
      if (!response.ok) return;
      const data = await response.json();
      setMenu({ categories: data.categories, items: data.items });
    } catch {
      /* The service worker serves the last good menu when offline. */
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const [openRes, shiftRes] = await Promise.all([
        fetch("/api/pos/orders"),
        fetch("/api/pos/orders?scope=shift"),
      ]);
      if (openRes.ok) {
        const data = await openRes.json();
        setTickets(data.orders as OrderView[]);
      }
      if (shiftRes.ok) {
        const data = await shiftRes.json();
        setShiftOrders(data.orders);
      }
    } catch {
      /* Offline: the rail keeps whatever it last had. */
    }
  }, []);

  const refreshShift = useCallback(async () => {
    await Promise.all([loadSession(), loadTickets()]);
  }, [loadSession, loadTickets]);

  // Restore a cart abandoned by a crash, a lock screen or a PWA relaunch. A
  // cashier halfway through a large order should not have to start again.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey.current);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          dispatch({ type: "replace", lines: parsed.lines, discount: parsed.discount ?? 0 });
          const last = parsed.lines[parsed.lines.length - 1];
          const lastKey = last?.key ?? last?.menuItemId;
          if (lastKey) setFocusedMenuItemId(lastKey);
        }
        if (typeof parsed.customerName === "string") setCustomerName(parsed.customerName);
        if (typeof parsed.customerPhone === "string") setCustomerPhone(parsed.customerPhone);
        if (typeof parsed.customerAddress === "string") setCustomerAddress(parsed.customerAddress);
        if (
          parsed.fulfillment === "DINE_IN" ||
          parsed.fulfillment === "TAKEAWAY" ||
          parsed.fulfillment === "DELIVERY"
        ) {
          setFulfillment(parsed.fulfillment);
        }
        if (typeof parsed.tableId === "string") setTableId(parsed.tableId);
      }
    } catch {
      /* Corrupt entry: start with an empty cart rather than failing to load. */
    }
  }, []);

  // Old saves may lack imageUrl — fill from the live menu without wiping qty.
  useEffect(() => {
    if (menu.items.length === 0 || cart.lines.length === 0) return;
    if (cart.lines.every((line) => line.imageUrl !== undefined)) return;
    const byId: Record<string, string | null> = {};
    for (const item of menu.items) byId[item.id] = item.imageUrl;
    dispatch({ type: "enrichImages", byId });
  }, [menu.items, cart.lines]);

  useEffect(() => {
    // The first run is the empty cart from before restore. Writing it would
    // wipe a sale the cashier had not finished.
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem(
        cartKey.current,
        JSON.stringify({
          ...cart,
          customerName,
          customerPhone,
          customerAddress,
          fulfillment,
          tableId,
        }),
      );
    } catch {
      /* Storage full or blocked. Not worth interrupting service over. */
    }
  }, [cart, customerName, customerPhone, customerAddress, fulfillment, tableId]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const stop = onReconnect((result) => {
      if (result.authFailed) {
        setBanner({ tone: "bad", text: "Signed out. Sign in again to send the queued sales." });
        return;
      }
      if (result.synced > 0) {
        setBanner({
          tone: "good",
          text: `${result.synced} sale${result.synced > 1 ? "s" : ""} sent through.`,
        });
        void loadSession();
        void loadTickets();
        // Karim may have changed a price while the till was offline.
        void loadMenu();
      }
      if (result.deadLettered > 0) {
        setBanner({
          tone: "bad",
          text: `${result.deadLettered} sale(s) could not be sent. Check the shift screen.`,
        });
      }
    });
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      stop();
    };
  }, [loadSession, loadTickets, loadMenu]);

  // A shift can go stale while the till sits open past midnight.
  useEffect(() => {
    const timer = setInterval(() => void loadSession(), 5 * 60_000);
    // Online orders arrive without anyone touching the till: look every 30s
    // while the till is on screen.
    const ticketTimer = setInterval(() => {
      if (document.visibilityState === "visible") void loadTickets();
    }, 30_000);
    return () => {
      clearInterval(timer);
      clearInterval(ticketTimer);
    };
  }, [loadSession, loadTickets]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pos/tables")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.tables)) {
          setTables(
            data.tables.map(
              (table: {
                id: string;
                label: string;
                area?: string;
                zone?: string;
                seats?: number;
                occupied?: boolean;
                openOrder?: unknown;
              }) => ({
                id: table.id,
                label: table.label,
                area: table.area ?? table.zone ?? "Floor",
                seats: table.seats ?? 0,
                occupied: Boolean(table.occupied ?? table.openOrder),
              }),
            ),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  /** Throws with a readable message so the payment sheet can show it in place. */
  async function submitOrder(
    method: PaymentChoice,
    extras: {
      tenderedAmount?: number;
      paymentReference?: string;
      splitPayments?: { method: string; amount: number; ref?: string }[];
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
    },
  ) {
    const clientRef = crypto.randomUUID();
    const deliveryType =
      fulfillment === "DINE_IN" && tableId
        ? "DINE_IN"
        : fulfillment === "DELIVERY"
          ? "DELIVERY"
          : fulfillment === "DINE_IN"
            ? "DINE_IN"
            : "TAKEAWAY";
    const payload = {
      clientRef,
      lines: chargingLines.map((line) => ({
        menuItemId: line.menuItemId,
        sizeId: line.sizeId ?? undefined,
        quantity: line.quantity,
        notes: line.notes,
      })),
      paymentMethod: method,
      discountAmount:
        chargeIds && chargeIds.length < cart.lines.length ? undefined : cart.discount || undefined,
      ...extras,
      deliveryType,
      tableId: fulfillment === "DINE_IN" ? tableId || undefined : undefined,
      customerAddress:
        fulfillment === "DELIVERY"
          ? extras.customerAddress?.trim() || customerAddress.trim() || undefined
          : undefined,
    };

    let response: Response;
    try {
      response = await fetchWithTimeout(
        "/api/pos/orders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        20_000,
      );
    } catch (error) {
      // Timeout or offline. Keep the sale rather than losing it — the clientRef
      // makes replaying it safe even if the request actually did reach the server.
      const timedOut =
        error instanceof Error && error.message.toLowerCase().includes("too long");
      if (!timedOut) {
        await enqueue(clientRef, payload);
        clearOrder();
        setPaying(false);
        setBanner({
          tone: "good",
          text: "Saved on this device. It will send itself when the network is back.",
        });
        return;
      }
      throw error;
    }

    if (response.status === 401) {
      router.push("/login");
      throw new Error("You have been signed out. Sign in again to carry on.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409) void loadSession();
      throw new Error(data.error ?? "Could not take that payment.");
    }

    const partial = Boolean(chargeIds && chargingLines.length > 0 && chargingLines.length < cart.lines.length);
    if (partial && chargeIds) {
      dispatch({ type: "removeMany", keys: chargeIds });
      setSelectedIds((current) => current.filter((id) => !chargeIds.includes(id)));
    } else {
      clearOrder();
      setSelectedIds([]);
    }
    setChargeIds(null);
    setPaying(false);
    setSlipKind("receipt");
    if (!data.order) {
      throw new Error("Payment went through, but the receipt did not come back. Check Orders.");
    }
    setReceipt(data.order);
    void loadSession();
    void loadTickets();
  }

  async function handleSignOut() {
    if (queued > 0) {
      setBanner({
        tone: "bad",
        text: `${queued} sale(s) still waiting to send. Stay signed in until they go through.`,
      });
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
  }

  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart.lines) {
      map[line.menuItemId] = (map[line.menuItemId] ?? 0) + line.quantity;
    }
    return map;
  }, [cart.lines]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function clearOrder() {
    dispatch({ type: "clear" });
    setSelectedIds([]);
    setChargeIds(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setFulfillment("TAKEAWAY");
    setTableId("");
    setFocusedMenuItemId(null);
    setQtyTarget(null);
  }

  function addItem(item: PosMenuItem) {
    if (locked) return;
    // A dish with sizes asks which one before it reaches the cart.
    if (item.sizes && item.sizes.length > 0) {
      setSizeFor(item);
      return;
    }
    dispatch({ type: "add", item });
    setFocusedMenuItemId(lineKey(item.id));
  }

  function addSized(item: PosMenuItem, size: PosMenuSize) {
    dispatch({ type: "add", item, size });
    setFocusedMenuItemId(lineKey(item.id, size.id));
    setSizeFor(null);
  }

  function editQty(line: CartLine) {
    setFocusedMenuItemId(line.key);
    setQtyTarget(line);
  }

  function openClose() {
    setMenuOpen(false);
    void loadTickets();
    setClosingId(session?.id ?? null);
  }

  const count = cartCount(cart);
  const firstName = activeUser.name.split(" ")[0] || activeUser.name;
  const avatarTint = staffAvatarTint(activeUser.name);
  const avatarInitials = staffInitials(activeUser.name);
  const staleTickets = session ? tickets.filter((ticket) => ticket.sessionId === session.id).length : 0;

  // No shift at all: the drawer is counted in before anything else. A shift that
  // is merely old gets the full till below, so its tickets can be dealt with.
  // Website orders alert on every till screen, shift open or not, until accepted.
  const onlineAlert = (
    <OnlineOrderAlert
      onAccepted={() => void loadTickets()}
      onOpenOrders={() => setView("tickets")}
    />
  );

  if (gate === "none" || gate === "error" || !session) {
    return (
      <>
      {onlineAlert}
      <OpenShiftCard
        userName={activeUser.name}
        defaultOpeningFloat={defaultOpeningFloat}
        loadError={gate === "error"}
        onOpened={() => {
          setView("register");
          void refreshShift();
        }}
        onSignOut={handleSignOut}
        backOfficeHref={backOfficeHref}
      />
      </>
    );
  }

  return (
    <div
      className="flex h-dvh max-h-dvh flex-col overflow-hidden lg:p-4 lg:gap-3"
      style={{
        background:
          "radial-gradient(circle at 0 100%, color-mix(in srgb, var(--s-brand) 8%, transparent), transparent 30%), var(--s-bg)",
      }}
    >
      {onlineAlert}
      <header
        className="z-30 shrink-0 border-b lg:rounded-[1.5rem] lg:border-0 lg:px-2"
        style={{
          background: "color-mix(in srgb, var(--s-panel) 92%, transparent)",
          backdropFilter: "blur(10px)",
          borderColor: "var(--s-border)",
          paddingTop: "env(safe-area-inset-top)",
          boxShadow: "var(--s-shadow)",
        }}
      >
        <div className="flex items-center gap-3 px-3 pt-2 pb-1.5 lg:px-4">
          <AnisLogo className="h-8 w-auto shrink-0" />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setSwitchOpen(true);
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-1 py-0.5 text-left"
            aria-label="Switch cashier"
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: avatarTint }}
            >
              {avatarInitials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">{firstName}</p>
              <p className="truncate text-[11px] leading-tight" style={{ color: "var(--s-ink-muted)" }}>
                <span className="money">
                  {session.takings.orderCount} sale{session.takings.orderCount === 1 ? "" : "s"} ·{" "}
                  {formatGHS(session.takings.gross)}
                </span>
              </p>
            </div>
          </button>

          <nav
            className="hidden md:grid lg:hidden grid-cols-3 gap-1 rounded-2xl p-1"
            style={{ background: "var(--s-panel-alt)" }}
            aria-label="Till sections"
          >
            <Tabs view={view} setView={setView} ticketCount={tickets.length} />
          </nav>

          <Link
            href="/pos/kitchen"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
            style={{ borderColor: "var(--s-border)", color: "var(--s-ink)" }}
            aria-label="Kitchen display"
          >
            <ChefHat className="h-5 w-5" />
          </Link>

          <FullscreenToggle />

          {(!online || queued > 0) && (
            <Pill tone="warn">
              <CloudOff className="w-3.5 h-3.5" />
              {!online ? "Offline" : `${queued} to send`}
            </Pill>
          )}

          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-xl border"
              style={{ borderColor: "var(--s-border)", color: "var(--s-ink)" }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="More"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 w-56 rounded-2xl border p-1 shadow-xl"
                  style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
                >
                  <MenuItem
                    icon={UserRound}
                    label="Switch cashier"
                    onClick={() => {
                      setMenuOpen(false);
                      setSwitchOpen(true);
                    }}
                  />
                  <MenuItem icon={LockKeyhole} label="Close shift" onClick={openClose} />
                  {backOfficeHref && (
                    <MenuItem
                      icon={LayoutDashboard}
                      label="Back office"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(backOfficeHref);
                      }}
                    />
                  )}
                  <div className="my-1 h-px" style={{ background: "var(--s-border)" }} />
                  <MenuItem
                    icon={LogOut}
                    label="Sign out"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleSignOut();
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <nav
          className="md:hidden mx-2 mb-2 grid grid-cols-3 gap-1 rounded-2xl p-1"
          style={{ background: "var(--s-panel-alt)" }}
          aria-label="Till sections"
        >
          <Tabs view={view} setView={setView} ticketCount={tickets.length} />
        </nav>

        {locked && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 lg:px-4"
            style={{ background: "color-mix(in srgb, var(--s-warn) 16%, var(--s-panel))" }}
          >
            <CircleAlert className="w-4 h-4 shrink-0" style={{ color: "var(--s-warn)" }} />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-bold" style={{ color: "var(--s-warn)" }}>
                The shift from {session.businessDay} is still open.
              </span>{" "}
              <span style={{ color: "var(--s-ink-muted)" }}>
                {staleTickets > 0
                  ? `Settle or void its ${staleTickets} unpaid ticket${staleTickets === 1 ? "" : "s"}, then close it. New sales start after that.`
                  : "Close it to start today's sales."}
              </span>
            </p>
            <Button size="sm" onClick={openClose}>
              Close it now
            </Button>
          </div>
        )}

        {banner && (
          <div
            role="status"
            className="px-3 py-2 text-sm font-medium"
            style={{
              background: `color-mix(in srgb, ${banner.tone === "good" ? "var(--s-good)" : "var(--s-bad)"} 14%, var(--s-panel))`,
              color: banner.tone === "good" ? "var(--s-good)" : "var(--s-bad)",
            }}
          >
            {banner.text}
            {queued > 0 && banner.tone === "bad" && (
              <button
                onClick={async () => {
                  const result = await syncPending();
                  if (result.synced > 0) {
                    setBanner({ tone: "good", text: `${result.synced} sale(s) sent.` });
                    void loadSession();
                  }
                }}
                className="ml-2 underline"
              >
                Send now
              </button>
            )}
          </div>
        )}
      </header>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:gap-3 ${
          view === "register"
            ? "lg:grid-cols-[5.5rem_minmax(0,1fr)_22.5rem]"
            : "lg:grid-cols-[5.5rem_minmax(0,1fr)]"
        }`}
      >
        <PosRail
          view={view}
          ticketCount={tickets.length}
          setView={setView}
          backOfficeHref={backOfficeHref}
          onSignOut={() => void handleSignOut()}
        />

        {view === "register" && (
          <>
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-[1.5rem] lg:bg-[var(--s-panel)] lg:shadow-[var(--s-shadow)]">
              <MenuGrid
                categories={menu.categories}
                items={menu.items}
                quantities={quantities}
                tickets={tickets}
                onAdd={addItem}
                onOpenTicket={(ticket) => setSettling(ticket)}
                locked={locked}
              />
            </main>
            <CartPanel
              cart={cart}
              totals={totals}
              dispatch={dispatch}
              focusedMenuItemId={focusedMenuItemId}
              onFocus={setFocusedMenuItemId}
              onEditQty={editQty}
              fulfillment={fulfillment}
              onFulfillment={setFulfillment}
              customerName={customerName}
              customerPhone={customerPhone}
              customerAddress={customerAddress}
              onCustomerName={setCustomerName}
              onCustomerPhone={setCustomerPhone}
              onCustomerAddress={setCustomerAddress}
              onClear={clearOrder}
              onCharge={() => {
                setChargeIds(null);
                setPaying(true);
              }}
              selectedIds={selectedIds}
              onToggleLine={(id) =>
                setSelectedIds((current) =>
                  current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
                )
              }
              onChargeSelected={() => {
                setChargeIds(selectedIds);
                setPaying(true);
              }}
              selectedTotal={selectedTotal}
              locked={locked}
              tables={tables}
              tableId={tableId}
              onTable={setTableId}
            />
          </>
        )}

        {view === "tickets" && (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-[1.5rem] lg:bg-[var(--s-panel)] lg:shadow-[var(--s-shadow)]">
            <OrderDesk
              tickets={tickets}
              shiftOrders={shiftOrders}
              canVoidPaid={canVoid}
              canEditPaid={canEditPaid}
              onTakePayment={(ticket) => setSettling(ticket)}
              onVoid={(ticket) => setVoiding(ticket)}
              onPrint={(order, kind) => {
                setSlipKind(kind === "invoice" ? "invoice" : "receipt");
                setReceipt(order);
              }}
              onEdit={(order) => setEditing(order)}
            />
          </main>
        )}

        {view === "shift" && (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-[1.5rem] lg:bg-[var(--s-panel)] lg:shadow-[var(--s-shadow)]">
            <ShiftPanel
              session={session}
              onCashMovement={() => setMovingCash(true)}
              onXReport={() => setXReportOpen(true)}
              onCloseShift={openClose}
            />
          </main>
        )}
      </div>

      {/* Mobile: the order bar sits above the home indicator, always reachable.
          Tapping it opens the cart sheet to review before charging, rather than
          jumping straight to payment — a phone cashier gets to catch a mis-tap. */}
      {view === "register" && count > 0 && (
        <div
          className="lg:hidden sticky bottom-0 px-3 py-2"
          style={{
            background: "color-mix(in srgb, var(--s-bg) 92%, transparent)",
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full min-h-14 items-center justify-between rounded-2xl px-4 py-3.5 font-bold text-white"
            style={{ background: "var(--s-brand)", boxShadow: "0 8px 20px color-mix(in srgb, var(--s-brand) 35%, transparent)" }}
          >
            <span>
              View {count} item{count > 1 ? "s" : ""}
            </span>
            <span className="money">{formatGHS(totals.total)}</span>
          </button>
        </div>
      )}

      {view === "register" && cartOpen && count > 0 && (
        <MobileCartSheet
          cart={cart}
          totals={totals}
          dispatch={dispatch}
          focusedMenuItemId={focusedMenuItemId}
          onFocus={setFocusedMenuItemId}
          onEditQty={editQty}
          fulfillment={fulfillment}
          onFulfillment={setFulfillment}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          onCustomerName={setCustomerName}
          onCustomerPhone={setCustomerPhone}
          onCustomerAddress={setCustomerAddress}
          onClear={clearOrder}
          tables={tables}
          tableId={tableId}
          onTable={setTableId}
          onClose={() => setCartOpen(false)}
          onCharge={() => {
            setCartOpen(false);
            setChargeIds(null);
            setPaying(true);
          }}
          selectedIds={selectedIds}
          onToggleLine={(id) =>
            setSelectedIds((current) =>
              current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
            )
          }
          onChargeSelected={() => {
            setCartOpen(false);
            setChargeIds(selectedIds);
            setPaying(true);
          }}
          selectedTotal={selectedTotal}
          locked={locked}
        />
      )}

      {sizeFor && (
        <SizePickerSheet item={sizeFor} onPick={(size) => addSized(sizeFor, size)} onClose={() => setSizeFor(null)} />
      )}

      {qtyTarget && (
        <QuantityEntrySheet
          productName={qtyTarget.name}
          unitPrice={qtyTarget.unitPrice}
          initialQty={qtyTarget.quantity}
          onConfirm={(quantity) => {
            dispatch({
              type: "setQuantity",
              key: qtyTarget.key,
              quantity,
            });
            if (quantity === 0) {
              const remaining = cart.lines.filter((line) => line.key !== qtyTarget.key);
              setFocusedMenuItemId(remaining[remaining.length - 1]?.key ?? null);
            }
          }}
          onClose={() => setQtyTarget(null)}
        />
      )}

      {paying && !locked && chargingLines.length > 0 && (
        <PaymentSheet
          totals={chargingTotals}
          fulfillment={fulfillment}
          onFulfillment={setFulfillment}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          onCustomerName={setCustomerName}
          onCustomerPhone={setCustomerPhone}
          onCustomerAddress={setCustomerAddress}
          tables={tables}
          tableId={tableId}
          onTable={setTableId}
          onClose={() => {
            setPaying(false);
            setChargeIds(null);
          }}
          onConfirm={submitOrder}
        />
      )}

      {settling && (
        <SettleSheet
          ticket={settling}
          onClose={() => setSettling(null)}
          onPrintBill={() => {
            const order = settling;
            setSettling(null);
            setSlipKind("receipt");
            setReceipt(order);
          }}
          onSettled={(order) => {
            setSettling(null);
            setSlipKind("receipt");
            setReceipt(order);
            void refreshShift();
          }}
        />
      )}

      {voiding && (
        <VoidSheet
          ticket={voiding}
          onClose={() => setVoiding(null)}
          onVoided={() => {
            setVoiding(null);
            setBanner({ tone: "good", text: "Ticket voided." });
            void refreshShift();
          }}
        />
      )}

      {movingCash && (
        <CashMovementDialog
          expenseCategories={expenseCategories}
          canFileExpense={canFileExpense}
          onClose={() => setMovingCash(false)}
          onRecorded={() => {
            setBanner({ tone: "good", text: "Cash movement recorded." });
            void loadSession();
          }}
        />
      )}

      {closingId === session.id && (
        <CloseShiftDialog
          session={session}
          tickets={tickets}
          boltTickets={shiftOrders.filter(
            (order) =>
              order.paymentMethod === "BOLT_FOOD" &&
              order.paymentStatus === "PENDING" &&
              order.status !== "CANCELLED" &&
              order.sessionId === session.id,
          )}
          canVoid={canVoid}
          onRefresh={refreshShift}
          onClose={() => setClosingId(null)}
          onFinished={() => {
            setClosingId(null);
            clearOrder();
            void refreshShift();
          }}
        />
      )}

      {editing && (
        <EditOrderSheet
          order={editing}
          menu={menu}
          endpoint={`/api/pos/orders/${editing.id}`}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setBanner({ tone: "good", text: "Order updated." });
            void loadTickets();
            void loadSession();
          }}
        />
      )}

      {xReportOpen && (
        <XReportSheet businessName={business.header} onClose={() => setXReportOpen(false)} />
      )}
      {switchOpen && (
        <CashierSwitchSheet
          currentUserId={activeUser.id}
          onClose={() => setSwitchOpen(false)}
          onSwitched={(next) => {
            setActiveUser({ id: next.id, name: next.name, role: next.role });
            cartKey.current = `anis-pos-cart:${next.id}`;
            setSwitchOpen(false);
            setBanner({ tone: "good", text: `${next.name.split(" ")[0]} is on the till` });
            router.refresh();
          }}
        />
      )}

      {receipt && (
        <ReceiptModal
          order={receipt}
          business={business}
          soldBy={activeUser.name}
          kind={slipKind}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}

function PosRail({
  view,
  ticketCount,
  setView,
  backOfficeHref,
  onSignOut,
}: {
  view: View;
  ticketCount: number;
  setView: (view: View) => void;
  backOfficeHref?: string;
  onSignOut: () => void;
}) {
  const entries = [
    { id: "register" as const, label: "Order", icon: Store },
    { id: "tickets" as const, label: "Orders", icon: ReceiptText, count: ticketCount },
    { id: "shift" as const, label: "Shift", icon: Wallet },
  ];
  return (
    <aside className="hidden lg:flex min-h-0 flex-col items-center rounded-[1.5rem] bg-[var(--s-panel)] px-2 py-4 shadow-[var(--s-shadow)]">
      <span
        className="mb-4 grid h-11 w-11 place-items-center rounded-full"
        style={{ background: "color-mix(in srgb, var(--s-brand) 10%, white)" }}
        aria-hidden
      >
        <UserRound className="h-5 w-5" style={{ color: "var(--s-brand)" }} />
      </span>
      <nav className="w-full space-y-2" aria-label="Till sections">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const active = view === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setView(entry.id)}
              className="relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold"
              style={{
                background: active ? "var(--s-brand)" : "var(--s-panel-alt)",
                color: active ? "#fff" : "var(--s-ink-muted)",
              }}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
              {!!entry.count && (
                <span
                  className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full px-1 text-[9px]"
                  style={{
                    background: active ? "#fff" : "var(--s-brand)",
                    color: active ? "var(--s-brand)" : "#fff",
                  }}
                >
                  {entry.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto w-full space-y-2">
        <Link
          href="/pos/kitchen"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold"
          style={{ background: "var(--s-panel-alt)", color: "var(--s-ink-muted)" }}
        >
          <ChefHat className="h-4 w-4" />
          Kitchen
        </Link>
        {backOfficeHref && (
          <a
            href={backOfficeHref}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold"
            style={{ background: "var(--s-panel-alt)", color: "var(--s-ink-muted)" }}
          >
            <LayoutDashboard className="h-4 w-4" />
            Office
          </a>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold"
          style={{ color: "var(--s-ink-faint)" }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function Tabs({
  view,
  setView,
  ticketCount,
}: {
  view: View;
  setView: (view: View) => void;
  ticketCount: number;
}) {
  return (
    <>
      <TabButton active={view === "register"} onClick={() => setView("register")}>
        <Store className="w-4 h-4" /> Register
      </TabButton>
      <TabButton active={view === "tickets"} onClick={() => setView("tickets")}>
        <Receipt className="w-4 h-4" /> Orders
        {ticketCount > 0 && <Badge>{ticketCount}</Badge>}
      </TabButton>
      <TabButton active={view === "shift"} onClick={() => setView("shift")}>
        <Wallet className="w-4 h-4" /> Shift
      </TabButton>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] sm:text-sm font-semibold whitespace-nowrap"
      style={{
        background: active ? "var(--s-panel)" : "transparent",
        color: active ? "var(--s-brand)" : "var(--s-ink-muted)",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.18)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="ml-0.5 rounded-full px-1.5 text-[0.7rem] font-bold"
      style={{ background: "var(--s-brand)", color: "#fff" }}
    >
      {children}
    </span>
  );
}

function Pill({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  const color = tone === "warn" ? "var(--s-warn)" : "var(--s-ink-muted)";
  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {children}
    </span>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Store;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium"
      style={{ color: "var(--s-ink)" }}
    >
      <Icon className="w-4 h-4" style={{ color: "var(--s-ink-muted)" }} />
      {label}
    </button>
  );
}
