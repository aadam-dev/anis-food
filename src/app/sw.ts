import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Caching rules for the till, ahead of Serwist's defaults.
 *
 * The point is narrow: a cashier whose signal drops mid-shift must still have a
 * menu to sell from. Reference data is cached; anything that moves money is not.
 */
const posCaching: RuntimeCaching[] = [
  {
    // Reference data. A five-second timeout because a slow connection is worse
    // than no connection at a counter — after five seconds, serve the last good
    // copy and let the cashier get on with it.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && (url.pathname === "/api/pos/menu" || url.pathname === "/api/pos/settings"),
    handler: new NetworkFirst({
      cacheName: "anis-pos-reference",
      networkTimeoutSeconds: 5,
      plugins: [
        {
          cacheWillUpdate: async ({ response }) =>
            response.status === 200 ? response : null,
        },
      ],
    }),
  },
  {
    // Money and shift state are never served from cache. A stale drawer total or
    // a replayed order list is worse than an honest failure the till can handle
    // — the offline queue exists precisely so this can fail safely.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin &&
      (url.pathname === "/api/pos/orders" ||
        url.pathname === "/api/pos/sessions" ||
        url.pathname === "/api/pos/cash-movements" ||
        url.pathname.startsWith("/api/admin/") ||
        url.pathname.startsWith("/api/auth/")),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...posCaching, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
