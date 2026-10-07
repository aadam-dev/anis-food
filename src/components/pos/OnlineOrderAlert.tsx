"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Check, Phone, MapPin, Store } from "lucide-react";
import { formatGHS } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import type { OrderView } from "./types";

/** How often the till asks for new website orders. */
const POLL_MS = 8_000;
/** How often the chime repeats while an order is waiting. */
const CHIME_MS = 15_000;

/**
 * Website orders cannot be missed: the till checks every few seconds, and a
 * new one takes over the top of the screen with a repeating chime until a
 * cashier accepts it. Accepting sends it to the kitchen board.
 */
export default function OnlineOrderAlert({
  onAccepted,
  onOpenOrders,
}: {
  onAccepted: () => void;
  onOpenOrders: () => void;
}) {
  const [pending, setPending] = useState<OrderView[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const notified = useRef(new Set<string>());
  const audio = useRef<AudioContext | null>(null);
  const baseTitle = useRef<string | null>(null);
  // Browsers keep a page silent until someone touches it. The chime is unlocked
  // on the first tap anywhere; if it is still blocked, the alert says so.
  const [soundBlocked, setSoundBlocked] = useState(false);

  const unlockSound = useCallback(() => {
    try {
      const context = audio.current ?? new AudioContext();
      audio.current = context;
      void context.resume();
      // A blocked resume never settles, so look at the state a moment later.
      window.setTimeout(() => setSoundBlocked(context.state !== "running"), 400);
    } catch {
      /* No audio device. */
    }
  }, []);

  useEffect(() => {
    const onGesture = () => {
      unlockSound();
      if (audio.current?.state === "running") {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
      }
    };
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [unlockSound]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/pos/online", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { orders: OrderView[] };
      setPending(data.orders);
      // A desktop notification too, for when the till is behind another window.
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const order of data.orders) {
          if (notified.current.has(order.id)) continue;
          notified.current.add(order.id);
          new Notification(`New online order ${callNumber(order.orderNumber)}`, {
            body: `${order.customerName ?? "Customer"} · ${formatGHS(order.total)} · ${order.deliveryType === "DELIVERY" ? "Delivery" : "Pickup"}`,
            tag: order.id,
            requireInteraction: true,
          });
        }
      }
    } catch {
      /* Offline: try again on the next tick. */
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    if (typeof Notification !== "undefined") {
      const check = window.setTimeout(() => setPermission(Notification.permission), 0);
      return () => {
        window.clearTimeout(first);
        window.clearTimeout(check);
        window.clearInterval(timer);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Chime and flash the tab title for as long as anything is waiting.
  const waiting = pending.length;
  useEffect(() => {
    if (waiting === 0) return;
    const chime = () => {
      try {
        const context = audio.current ?? new AudioContext();
        audio.current = context;
        if (context.state !== "running") {
          void context.resume();
          window.setTimeout(() => setSoundBlocked(context.state !== "running"), 400);
        }
        [0, 0.22].forEach((offset, index) => {
          const tone = context.createOscillator();
          const gain = context.createGain();
          tone.frequency.value = index === 0 ? 880 : 1175;
          gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.35, context.currentTime + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.35);
          tone.connect(gain).connect(context.destination);
          tone.start(context.currentTime + offset);
          tone.stop(context.currentTime + offset + 0.4);
        });
      } catch {
        /* No audio device: the banner still shows. */
      }
    };
    chime();
    const chimeTimer = window.setInterval(chime, CHIME_MS);
    baseTitle.current ??= document.title;
    const title = baseTitle.current;
    let flip = false;
    const titleTimer = window.setInterval(() => {
      flip = !flip;
      document.title = flip ? `(${waiting}) New online order` : title;
    }, 1_000);
    return () => {
      window.clearInterval(chimeTimer);
      window.clearInterval(titleTimer);
      document.title = title;
    };
  }, [waiting]);

  async function accept(order: OrderView) {
    setBusyId(order.id);
    setError(null);
    try {
      const response = await fetch(`/api/pos/orders/${order.id}/accept`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not accept that order. Try again.");
        return;
      }
      setPending((current) => current.filter((entry) => entry.id !== order.id));
      onAccepted();
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function enableDesktopAlerts() {
    if (typeof Notification === "undefined") return;
    setPermission(await Notification.requestPermission());
  }

  if (waiting === 0) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex justify-center p-3"
      role="alertdialog"
      aria-live="assertive"
      aria-label={`${waiting} new online order${waiting === 1 ? "" : "s"}`}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl"
        style={{ background: "var(--s-panel)", color: "var(--s-ink)", boxShadow: "0 24px 60px -12px rgb(0 0 0 / 0.45)", border: "2px solid var(--s-brand)" }}
      >
        <div className="flex items-center gap-3 px-5 py-3 text-white" style={{ background: "var(--s-brand)" }}>
          <BellRing className="h-5 w-5 animate-pulse" />
          <p className="flex-1 font-extrabold">
            {waiting === 1 ? "New online order" : `${waiting} new online orders`}
          </p>
          <button type="button" onClick={onOpenOrders} className="rounded-xl px-3 text-sm font-bold underline !min-h-9">
            Open Orders
          </button>
        </div>
        <ul className="max-h-[60dvh] divide-y overflow-y-auto" style={{ borderColor: "var(--s-border)" }}>
          {pending.map((order) => (
            <li key={order.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
              <span className="money text-3xl font-extrabold leading-none">{callNumber(order.orderNumber)}</span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold">
                  {order.customerName ?? "Customer"} · {formatGHS(order.total)}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: "var(--s-ink-muted)" }}>
                  {order.customerPhone && (
                    <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--s-brand)" }}>
                      <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1">
                    {order.deliveryType === "DELIVERY" ? <MapPin className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                    {order.deliveryType === "DELIVERY" ? order.customerAddress || "Delivery" : "Pickup"}
                  </span>
                </p>
                <p className="mt-1">
                  {order.items
                    .map((item) => `${item.quantity}× ${item.name}${item.sizeLabel ? ` · ${item.sizeLabel}` : ""}`)
                    .join(", ")}
                </p>
                {order.notes && (
                  <p className="mt-1 italic" style={{ color: "var(--s-ink-muted)" }}>
                    “{order.notes}”
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void accept(order)}
                disabled={busyId !== null}
                className="inline-flex min-h-14 items-center gap-2 rounded-2xl px-5 text-base font-extrabold text-white disabled:opacity-60"
                style={{ background: "var(--s-good)" }}
              >
                <Check className="h-5 w-5" /> {busyId === order.id ? "Accepting…" : "Accept"}
              </button>
            </li>
          ))}
        </ul>
        {soundBlocked && (
          <button
            type="button"
            onClick={unlockSound}
            className="w-full border-t px-5 py-2.5 text-left text-sm font-bold"
            style={{ borderColor: "var(--s-border)", color: "var(--s-warn)", background: "var(--s-warn-soft)" }}
          >
            The alert sound is blocked by the browser. Tap here to turn it on.
          </button>
        )}
        {(error || permission === "default") && (
          <div className="flex flex-wrap items-center gap-3 border-t px-5 py-2.5 text-xs" style={{ borderColor: "var(--s-border)" }}>
            {error && (
              <span role="alert" style={{ color: "var(--s-bad)" }}>
                {error}
              </span>
            )}
            {permission === "default" && (
              <button type="button" onClick={() => void enableDesktopAlerts()} className="font-bold underline !min-h-8" style={{ color: "var(--s-brand)" }}>
                Also alert me when the till is in the background
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
