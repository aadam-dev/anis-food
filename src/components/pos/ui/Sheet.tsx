"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Open sheets, innermost last. Only the top one answers Escape and traps Tab. */
const openStack: string[] = [];

const noopSubscribe = () => () => {};

/**
 * The one dialog shell the till uses.
 *
 * Bottom sheet on a phone, centred card on a tablet or desktop. Every sheet gets
 * the same header, scroll body, pinned footer, safe-area padding, Escape and
 * backdrop close, and focus trap, so no dialog on the till behaves differently
 * from the next one.
 */
const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
} as const;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Sheet({
  title,
  subtitle,
  eyebrow,
  onClose,
  children,
  footer,
  size = "md",
  fullOnMobile = false,
  dismissible = true,
  headerExtra,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** Long flows (closing the shift) take the whole phone screen. */
  fullOnMobile?: boolean;
  /** False while a request is in flight, so a stray tap cannot abandon it. */
  dismissible?: boolean;
  headerExtra?: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    closeRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!mounted) return;
    openStack.push(titleId);
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (openStack[openStack.length - 1] !== titleId) return;
      if (event.key === "Escape") {
        if (dismissibleRef.current) closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const index = openStack.lastIndexOf(titleId);
      if (index >= 0) openStack.splice(index, 1);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [mounted, titleId]);

  if (!mounted) return null;

  return createPortal(
    <div
      data-surface="pos"
      data-theme={document.querySelector("[data-surface]")?.getAttribute("data-theme") ?? "dark"}
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4"
      style={{ background: "transparent" }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-[fade-in_120ms_ease-out]"
        onClick={() => dismissible && onClose()}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex w-full flex-col border shadow-2xl ${SIZES[size]} ${
          fullOnMobile
            ? "h-dvh sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-3xl"
            : "max-h-[92dvh] rounded-t-3xl sm:rounded-3xl"
        } animate-[sheet-in_160ms_ease-out]`}
        style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
      >
        {!fullOnMobile && (
          <span
            aria-hidden
            className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full"
            style={{ background: "var(--s-border-strong, var(--s-border))" }}
          />
        )}
        <header
          className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b"
          style={{
            borderColor: "var(--s-border)",
            paddingTop: fullOnMobile ? "max(1rem, env(safe-area-inset-top))" : undefined,
          }}
        >
          <div className="min-w-0">
            {eyebrow && (
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--s-ink-faint)" }}
              >
                {eyebrow}
              </p>
            )}
            <h2 id={titleId} className="text-lg font-bold leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <div className="mt-0.5 text-sm" style={{ color: "var(--s-ink-muted)" }}>
                {subtitle}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              className="h-11 w-11 -mr-2 grid place-items-center rounded-xl disabled:opacity-40"
              style={{ color: "var(--s-ink-muted)" }}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer && (
          <footer
            className="border-t px-5 pt-3"
            style={{
              borderColor: "var(--s-border)",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Inline error line used inside sheets. */
export function SheetError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl px-3 py-2.5 text-sm font-medium"
      style={{
        color: "var(--s-bad)",
        background: "color-mix(in srgb, var(--s-bad) 12%, transparent)",
      }}
    >
      {message}
    </p>
  );
}
