"use client";

import { useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import {
  subscribeInstall,
  getInstallState,
  getServerInstallState,
  dismissInstall,
  markInstalled,
} from "@/lib/install-store";

/**
 * "Add to Home Screen", offered rather than left for staff to discover.
 *
 * Without this, installing means knowing to open the browser's overflow menu and
 * find the right item — which nobody does, so the app stays a browser tab and
 * loses the offline queue and the full-screen till.
 */
export default function InstallPrompt({ compact = false }: { compact?: boolean } = {}) {
  const state = useSyncExternalStore(
    subscribeInstall,
    getInstallState,
    getServerInstallState,
  );

  if (state.kind === "unavailable") return null;

  // Sidebar version: one quiet line, so it never pushes the day's numbers down.
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs"
        style={{ background: "var(--s-sunk)", color: "var(--s-ink-muted)" }}
      >
        <Download className="h-4 w-4 shrink-0" style={{ color: "var(--s-brand)" }} />
        {state.kind === "ios" ? (
          <span className="min-w-0 flex-1">Share, then Add to Home Screen</span>
        ) : (
          <button
            className="!min-h-0 min-w-0 flex-1 text-left font-bold"
            style={{ color: "var(--s-ink)" }}
            onClick={async () => {
              await state.event.prompt();
              const { outcome } = await state.event.userChoice;
              if (outcome === "accepted") markInstalled();
            }}
          >
            Install the app
          </button>
        )}
        <button onClick={dismissInstall} aria-label="Not now" className="!min-h-0 shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-3"
      style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
    >
      <Download className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--s-brand)" }} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">Put Anis on the home screen</p>
        {state.kind === "ios" ? (
          <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Tap Share, then <strong>Add to Home Screen</strong>. It opens full screen and
            keeps working when the network drops.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm" style={{ color: "var(--s-ink-muted)" }}>
              Opens full screen and keeps taking orders when the network drops.
            </p>
            <button
              onClick={async () => {
                await state.event.prompt();
                const { outcome } = await state.event.userChoice;
                if (outcome === "accepted") markInstalled();
              }}
              className="mt-3 rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--s-brand)" }}
            >
              Install
            </button>
          </>
        )}
      </div>
      <button
        onClick={dismissInstall}
        className="h-8 w-8 grid place-items-center rounded-lg shrink-0"
        style={{ color: "var(--s-ink-faint)" }}
        aria-label="Not now"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
