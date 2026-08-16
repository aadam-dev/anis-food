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
import { CloudOff, Receipt, Store, LogOut, Wallet } from "lucide-react";
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
import PaymentSheet from "./PaymentSheet";
import ShiftPanel from "./ShiftPanel";
import OpenTickets from "./OpenTickets";
import ReceiptModal from "./ReceiptModal";
import type {
  OrderView,
  PosCategory,
  PosMenuItem,
  SessionView,
  PaymentChoice,
} from "./types";

type View = "register" | "tickets" | "shift";
type Gate = "none" | "stale" | "active" | "error";

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
}

export default function Register({
  user,
  business,
  defaultOpeningFloat,
  initialSession,
  initialCategories,
  initialItems,
  initialTickets,
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
  const [view, setView] = useState<View>("register");
  const [tickets, setTickets] = useState<OrderView[]>(initialTickets);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<OrderView | null>(null);
  const [online, setOnline] = useState(true);
  // Reads straight from the queue store, so no effect has to set it.
  const queued = useSyncExternalStore(subscribeQueue, getQueueCount, getServerQueueCount);
  const [banner, setBanner] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const cartKey = useRef(`anis-pos-cart:${user.name}`);

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
      const data = await response.json();
      if (!data.session) {
        setSession(null);
        setGate("none");
      } else {
        setSession(data.session);
        setGate(data.session.isStale ? "stale" : "active");
      }
    } catch {
      setGate("error");
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

  // Restore a cart abandoned by a crash, a lock screen or a PWA relaunch. A
  // cashier halfway through a large order should not have to start again.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey.current);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          dispatch({ type: "replace", lines: parsed.lines, discount: parsed.discount ?? 0 });
        }
      }
    } catch {
      /* Corrupt entry: start with an empty cart rather than failing to load. */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(cartKey.current, JSON.stringify(cart));
    } catch {
      /* Storage full or blocked. Not worth interrupting service over. */
    }
  }, [cart]);

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

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

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

    try {
      const response = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setBanner({ tone: "bad", text: data.error ?? "Could not take that payment." });
        return;
      }

      dispatch({ type: "clear" });
      setPaying(false);
      setReceipt(data.order);
      void loadSession();
      void loadTickets();
    } catch {
      // No connection. Keep the sale rather than losing it — the clientRef makes
      // replaying it safe even if the request actually did reach the server.
      await enqueue(clientRef, payload);
      dispatch({ type: "clear" });
      setPaying(false);
      setBanner({
        tone: "good",
        text: "Saved on this device. It will send itself when the network is back.",
      });
    }
  }

  async function handleSignOut() {
    if (queued > 0) {
      setBanner({
        tone: "bad",
        text: `${queued} sale(s) still waiting to send. Stay signed in until they go through.`,
      });
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const count = cartCount(cart);

  // No shift, or a shift left open from a previous day. Either way the cashier
  // deals with the drawer before anything else can happen.
  if (gate === "none" || gate === "stale" || gate === "error") {
    return (
      <ShiftPanel
        session={session}
        gate={gate}
        defaultOpeningFloat={defaultOpeningFloat}
        onChanged={() => {
          void loadSession();
          void loadTickets();
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "var(--s-panel)",
          borderColor: "var(--s-border)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="flex items-center gap-1 px-2 py-2">
          <TabButton active={view === "register"} onClick={() => setView("register")}>
            <Store className="w-4 h-4" /> Register
          </TabButton>
          <TabButton active={view === "tickets"} onClick={() => setView("tickets")}>
            <Receipt className="w-4 h-4" /> Tickets
            {tickets.length > 0 && <Badge>{tickets.length}</Badge>}
          </TabButton>
          <TabButton active={view === "shift"} onClick={() => setView("shift")}>
            <Wallet className="w-4 h-4" /> Shift
          </TabButton>
          <button
            onClick={handleSignOut}
            className="ml-auto h-11 w-11 grid place-items-center rounded-lg"
            style={{ color: "var(--s-ink-muted)" }}
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {(!online || queued > 0) && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 text-xs"
            style={{ background: "var(--s-hover)", color: "var(--s-warn)" }}
          >
            <CloudOff className="w-3.5 h-3.5 shrink-0" />
            {!online && <span>No network — sales are being saved on this device.</span>}
            {queued > 0 && (
              <button
                onClick={async () => {
                  const result = await syncPending();
                  if (result.synced > 0) {
                    setBanner({ tone: "good", text: `${result.synced} sale(s) sent.` });
                    void loadSession();
                  }
                }}
                className="underline ml-auto"
              >
                {queued} waiting — send now
              </button>
            )}
          </div>
        )}

        {banner && (
          <div
            role="status"
            className="px-3 py-2 text-sm"
            style={{
              background: "var(--s-hover)",
              color: banner.tone === "good" ? "var(--s-good)" : "var(--s-bad)",
            }}
          >
            {banner.text}
          </div>
        )}
      </header>

      {view === "register" && (
        <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[1fr_22rem]">
          <MenuGrid
            categories={menu.categories}
            items={menu.items}
            onAdd={(item) => dispatch({ type: "add", item })}
          />
          <CartPanel
            cart={cart}
            totals={totals}
            dispatch={dispatch}
            onCharge={() => setPaying(true)}
          />
        </div>
      )}

      {view === "tickets" && (
        <OpenTickets
          tickets={tickets}
          onSettled={(order) => {
            setReceipt(order);
            void loadTickets();
            void loadSession();
          }}
          onError={(text) => setBanner({ tone: "bad", text })}
        />
      )}

      {view === "shift" && (
        <ShiftPanel
          session={session}
          gate="active"
          defaultOpeningFloat={defaultOpeningFloat}
          onChanged={() => {
            void loadSession();
            void loadTickets();
          }}
          onSignOut={handleSignOut}
        />
      )}

      {/* Mobile: the charge bar sits above the home indicator, always reachable. */}
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
            onClick={() => setPaying(true)}
            className="w-full rounded-xl px-4 py-3.5 font-bold text-white flex items-center justify-between"
            style={{ background: "var(--s-brand)" }}
          >
            <span>
              Charge {count} item{count > 1 ? "s" : ""}
            </span>
            <span className="money">{formatGHS(totals.total)}</span>
          </button>
        </div>
      )}

      {paying && (
        <PaymentSheet
          totals={totals}
          onClose={() => setPaying(false)}
          onConfirm={submitOrder}
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
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold"
      style={{
        background: active ? "var(--s-hover)" : "transparent",
        color: active ? "var(--s-brand)" : "var(--s-ink-muted)",
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
