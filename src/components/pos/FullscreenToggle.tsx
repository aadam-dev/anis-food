"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

/**
 * Enter / leave browser fullscreen. On a till in a windowed Chrome session the
 * Windows taskbar eats the open-shift confirm button; fullscreen recovers that
 * height. Standalone PWA installs are already chrome-less, so the control hides.
 */
export default function FullscreenToggle({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const can =
      typeof root.requestFullscreen === "function" ||
      typeof (root as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
        .webkitRequestFullscreen === "function";
    setSupported(can);
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    );
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  if (!supported || standalone) return null;

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
