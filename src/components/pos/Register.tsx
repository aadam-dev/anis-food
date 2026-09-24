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
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CircleAlert,
  CloudOff,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Receipt,
  Store,
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
import { cartReducer, emptyCart, cartCount } from "./cartReducer";
import MenuGrid from "./MenuGrid";
import CartPanel from "./CartPanel";
import MobileCartSheet from "./MobileCartSheet";
import PaymentSheet from "./PaymentSheet";
import ShiftPanel, { OpenShiftCard } from "./ShiftPanel";
import OpenTickets, { SettleSheet, VoidSheet } from "./OpenTickets";
import ReceiptModal from "./ReceiptModal";
import QuantityEntrySheet from "./QuantityEntrySheet";
import CashMovementDialog from "./CashMovementDialog";
import CloseShiftDialog from "./CloseShiftDialog";
import Button from "./ui/Button";
import type {
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
  user: { name: string; role: string };
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
  const [paying, setPaying] = useState(false);
  // Phone only: the cart lives in a slide-up sheet, since there's no room for a
  // side rail. Desktop shows CartPanel inline and never opens this.
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<OrderView | null>(null);
  const [online, setOnline] = useState(true);
  // Reads straight from the queue store, so no effect has to set it.
  const queued = useSyncExternalStore(subscribeQueue, getQueueCount, getServerQueueCount);
  const [banner, setBanner] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [settling, setSettling] = useState<OrderView | null>(null);
  const [voiding, setVoiding] = useState<OrderView | null>(null);
  const [closing, setClosing] = useState(false);
  const [movingCash, setMovingCash] = useState(false);
  const [focusedMenuItemId, setFocusedMenuItemId] = useState<string | null>(null);
  const [qtyTarget, setQtyTarget] = useState<CartLine | null>(null);
  const cartKey = useRef(`anis-pos-cart:${user.name}`);
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
      const response = await fetch("/api/pos/orders");
      if (!response.ok) return;
      const data = await response.json();
      setTickets(data.orders);
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
          if (last?.menuItemId) setFocusedMenuItemId(last.menuItemId);
        }
        if (typeof parsed.customerName === "string") setCustomerName(parsed.customerName);
        if (typeof parsed.customerPhone === "string") setCustomerPhone(parsed.customerPhone);
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
        JSON.stringify({ ...cart, customerName, customerPhone }),
      );
    } catch {
      /* Storage full or blocked. Not worth interrupting service over. */
    }
  }, [cart, customerName, customerPhone]);

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
    return () => clearInterval(timer);
  }, [loadSession]);

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
    },
  ) {
    const clientRef = crypto.randomUUID();
    const payload = {
      clientRef,
      lines: cart.lines.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        notes: line.notes,
      })),
      paymentMethod: method,
      discountAmount: cart.discount || undefined,
      ...extras,
    };

    let response: Response;
    try {
      response = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // No connection. Keep the sale rather than losing it — the clientRef makes
      // replaying it safe even if the request actually did reach the server.
      await enqueue(clientRef, payload);
      clearOrder();
      setPaying(false);
      setBanner({
        tone: "good",
        text: "Saved on this device. It will send itself when the network is back.",
      });
      return;
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

    clearOrder();
    setPaying(false);
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

  function clearOrder() {
    dispatch({ type: "clear" });
    setCustomerName("");
    setCustomerPhone("");
    setFocusedMenuItemId(null);
    setQtyTarget(null);
  }

  function addItem(item: PosMenuItem) {
    if (locked) return;
    dispatch({ type: "add", item });
    setFocusedMenuItemId(item.id);
  }

  function editQty(line: CartLine) {
    setFocusedMenuItemId(line.menuItemId);
    setQtyTarget(line);
  }

  function openClose() {
    setMenuOpen(false);
    void loadTickets();
    setClosing(true);
  }

  const count = cartCount(cart);
  const firstName = user.name.split(" ")[0] || user.name;
  const staleTickets = session ? tickets.filter((ticket) => ticket.sessionId === session.id).length : 0;

  // No shift at all: the drawer is counted in before anything else. A shift that
  // is merely old gets the full till below, so its tickets can be dealt with.
  if (gate === "none" || gate === "error" || !session) {
    return (
      <OpenShiftCard
        userName={user.name}
        defaultOpeningFloat={defaultOpeningFloat}
        loadError={gate === "error"}
        onOpened={() => {
          setView("register");
          void refreshShift();
        }}
        onSignOut={handleSignOut}
        backOfficeHref={backOfficeHref}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "color-mix(in srgb, var(--s-panel) 92%, transparent)",
          backdropFilter: "blur(10px)",
          borderColor: "var(--s-border)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="flex items-center gap-3 px-3 pt-2 pb-1.5 lg:px-4">
          <AnisLogo className="h-8 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{firstName}</p>
            <p className="truncate text-[11px] leading-tight" style={{ color: "var(--s-ink-muted)" }}>
              <span className="money">
                {session.takings.orderCount} sale{session.takings.orderCount === 1 ? "" : "s"} ·{" "}
                {formatGHS(session.takings.gross)}
              </span>
            </p>
          </div>

          <nav
            className="hidden md:grid grid-cols-3 gap-1 rounded-2xl p-1"
            style={{ background: "var(--s-panel-alt)" }}
            aria-label="Till sections"
          >
            <Tabs view={view} setView={setView} ticketCount={tickets.length} />
          </nav>

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
                    icon={ArrowLeftRight}
                    label="Cash in / out"
                    onClick={() => {
                      setMenuOpen(false);
                      setMovingCash(true);
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

      {view === "register" && (
        <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[1fr_24rem]">
          <MenuGrid
            categories={menu.categories}
            items={menu.items}
            quantities={quantities}
            tickets={tickets}
            onAdd={addItem}
            onOpenTicket={(ticket) => setSettling(ticket)}
            locked={locked}
          />
          <CartPanel
            cart={cart}
            totals={totals}
            dispatch={dispatch}
            focusedMenuItemId={focusedMenuItemId}
            onFocus={setFocusedMenuItemId}
            onEditQty={editQty}
            customerName={customerName}
            customerPhone={customerPhone}
            onCustomerName={setCustomerName}
            onCustomerPhone={setCustomerPhone}
            onClear={clearOrder}
            onCharge={() => setPaying(true)}
            locked={locked}
          />
        </div>
      )}

      {view === "tickets" && (
        <OpenTickets
          tickets={tickets}
          canVoid={canVoid}
          onTakePayment={(ticket) => setSettling(ticket)}
          onVoid={(ticket) => setVoiding(ticket)}
        />
      )}

      {view === "shift" && (
        <ShiftPanel
          session={session}
          onCashMovement={() => setMovingCash(true)}
          onCloseShift={openClose}
        />
      )}

      {/* Mobile: the order bar sits above the home indicator, always reachable.
          Tapping it opens the cart sheet to review before charging, rather than
          jumping straight to payment — a phone cashier gets to catch a mis-tap. */}
      {view === "register" && count > 0 && (
        <div
          className="lg:hidden sticky bottom-0 border-t px-3 py-2"
          style={{
            background: "var(--s-panel)",
            borderColor: "var(--s-border)",
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full rounded-2xl px-4 py-3.5 font-bold text-white flex items-center justify-between"
            style={{ background: "var(--s-brand)" }}
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
          customerName={customerName}
          customerPhone={customerPhone}
          onCustomerName={setCustomerName}
          onCustomerPhone={setCustomerPhone}
          onClear={clearOrder}
          onClose={() => setCartOpen(false)}
          onCharge={() => {
            setCartOpen(false);
            setPaying(true);
          }}
          locked={locked}
        />
      )}

      {qtyTarget && (
        <QuantityEntrySheet
          productName={qtyTarget.name}
          unitPrice={qtyTarget.unitPrice}
          initialQty={qtyTarget.quantity}
          onConfirm={(quantity) => {
            dispatch({
              type: "setQuantity",
              menuItemId: qtyTarget.menuItemId,
              quantity,
            });
            if (quantity === 0) {
              const remaining = cart.lines.filter((line) => line.menuItemId !== qtyTarget.menuItemId);
              setFocusedMenuItemId(remaining[remaining.length - 1]?.menuItemId ?? null);
            }
          }}
          onClose={() => setQtyTarget(null)}
        />
      )}

      {paying && !locked && (
        <PaymentSheet
          totals={totals}
          customerName={customerName}
          customerPhone={customerPhone}
          onCustomerName={setCustomerName}
          onCustomerPhone={setCustomerPhone}
          onClose={() => setPaying(false)}
          onConfirm={submitOrder}
        />
      )}

      {settling && (
        <SettleSheet
          ticket={settling}
          onClose={() => setSettling(null)}
          onSettled={(order) => {
            setSettling(null);
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

      {closing && (
        <CloseShiftDialog
          session={session}
          tickets={tickets}
          canVoid={canVoid}
          onRefresh={refreshShift}
          onClose={() => setClosing(false)}
          onFinished={() => {
            setClosing(false);
            clearOrder();
            void refreshShift();
          }}
        />
      )}

      {receipt && (
        <ReceiptModal
          order={receipt}
          business={business}
          soldBy={user.name}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
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
        <Receipt className="w-4 h-4" /> Tickets
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
