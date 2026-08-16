"use client";

/**
 * Whether "add to home screen" can be offered, and how.
 *
 * This is browser state, not React state: it depends on an event the browser
 * fires when it feels like it, on the platform, and on whether the app is
 * already installed. Exposing it as a subscribable store lets components read it
 * with useSyncExternalStore rather than detecting it in an effect and calling
 * setState — which React 19 flags, correctly, as a source of hydration bugs.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  /** Nothing to offer: already installed, dismissed, or an unsupported browser. */
  | { kind: "unavailable" }
  /** Chrome and friends handed us an event we can trigger. */
  | { kind: "prompt"; event: BeforeInstallPromptEvent }
  /** iOS Safari never fires the event, so we explain the Share-sheet route. */
  | { kind: "ios" };

const DISMISSED_KEY = "anis-install-dismissed";
const UNAVAILABLE: InstallState = { kind: "unavailable" };

let state: InstallState = UNAVAILABLE;
const listeners = new Set<() => void>();
let started = false;

function publish(next: InstallState) {
  state = next;
  for (const listener of listeners) listener();
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function start() {
  if (started) return;
  started = true;

  if (localStorage.getItem(DISMISSED_KEY) === "1" || isInstalled()) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    publish({ kind: "prompt", event: event as BeforeInstallPromptEvent });
  });

  // iOS Safari only. Chrome and Firefox on iOS cannot install at all, so
  // telling them to tap Share would be advice that goes nowhere.
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)) {
    publish({ kind: "ios" });
  }
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

export function getInstallState(): InstallState {
  return state;
}

/** No install prompt exists during a server render. */
export function getServerInstallState(): InstallState {
  return UNAVAILABLE;
}

export function dismissInstall(): void {
  localStorage.setItem(DISMISSED_KEY, "1");
  publish(UNAVAILABLE);
}

export function markInstalled(): void {
  publish(UNAVAILABLE);
}
