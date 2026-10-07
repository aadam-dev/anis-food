"use client";

import { useSyncExternalStore } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

function canFullscreen(): boolean {
  const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  return !standalone && (typeof root.requestFullscreen === "function" || typeof root.webkitRequestFullscreen === "function");
}

const subscribe = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const noop = () => () => {};

/**
 * Enter / leave browser fullscreen. On a till in a windowed Chrome session the
 * Windows taskbar eats the open-shift confirm button; fullscreen recovers that
 * height. Standalone PWA installs are already chrome-less, so the control hides.
 */
export default function FullscreenToggle({ className = "" }: { className?: string }) {
  // Hidden on the server and on first paint; shown once the browser says it can.
  const available = useSyncExternalStore(noop, canFullscreen, () => false);
  const active = useSyncExternalStore(subscribe, () => Boolean(document.fullscreenElement), () => false);

  if (!available) return null;

  async function toggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const root = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (root.requestFullscreen) await root.requestFullscreen();
      else await root.webkitRequestFullscreen?.();
    } catch {
      // User gesture rejected or the browser blocked it — stay windowed.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${className}`}
      style={{ borderColor: "var(--s-border)", color: "var(--s-ink)" }}
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      title={active ? "Exit fullscreen" : "Fullscreen"}
    >
      {active ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
    </button>
  );
}
