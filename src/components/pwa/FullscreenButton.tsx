"use client";

import { useSyncExternalStore } from "react";
import { Maximize, Minimize } from "lucide-react";

/**
 * Full screen for the installed till on a touch PC.
 *
 * A windowed browser leaves the taskbar and the address bar over the register.
 * One tap fills the screen; the same button brings the window back.
 */

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function fullscreenActive() {
  return document.fullscreenElement != null;
}

function fullscreenSupported() {
  return typeof document.documentElement.requestFullscreen === "function";
}

export default function FullscreenButton() {
  const active = useSyncExternalStore(subscribeFullscreen, fullscreenActive, () => false);
  const supported = useSyncExternalStore(() => () => {}, fullscreenSupported, () => false);

  if (!supported) return null;

  async function toggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // The browser can refuse (an iframe, or a gesture it does not trust).
      // Leaving the button in place is more useful than hiding the control.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={active}
      aria-label={active ? "Leave full screen" : "Full screen"}
      title={active ? "Leave full screen" : "Full screen"}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
      style={{
        borderColor: "var(--s-border)",
        color: "var(--s-ink)",
        background: "var(--s-panel)",
      }}
    >
      {active ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
    </button>
  );
}
