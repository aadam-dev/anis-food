"use client";

import { openDB, type IDBPDatabase } from "idb";

/**
 * Sales that could not reach the server yet.
 *
 * The network in Madina drops. When it does, the till must keep taking money —
 * a cashier cannot tell a queue of customers to wait for the internet. Orders go
 * into IndexedDB and are pushed when the connection returns.
 *
 * Safe to replay because every order carries a clientRef the server treats as an
 * idempotency key: sending the same order twice returns the first one rather
 * than charging the customer again.
 */

const DB_NAME = "anis-pos-offline";
const STORE = "pending-orders";
const DEAD_LETTER = "failed-orders";
const DB_VERSION = 1;

/** Roughly 20 minutes of backoff before we stop trying. */
const MAX_ATTEMPTS = 8;

/**
 * Statuses that will never succeed on a retry. A 400 means the request itself is
 * wrong; sending it again a hundred times just burns battery and hides the
 * problem. These go to the dead-letter store where a human can see them.
 */
const PERMANENT_FAILURES = new Set([400, 403, 404, 409, 422]);

export interface PendingOrder {
  clientRef: string;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  deadLettered: number;
  /** The session expired while offline — the cashier has to sign in again. */
  authFailed: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "clientRef" });
        }
        if (!database.objectStoreNames.contains(DEAD_LETTER)) {
          database.createObjectStore(DEAD_LETTER, { keyPath: "clientRef" });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueue(clientRef: string, payload: unknown): Promise<void> {
  const database = await db();
  await database.put(STORE, {
    clientRef,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  } satisfies PendingOrder);
  await refreshQueueCount();
}

export async function pendingCount(): Promise<number> {
  const database = await db();
  return database.count(STORE);
}

export async function pendingOrders(): Promise<PendingOrder[]> {
  const database = await db();
  return database.getAll(STORE);
}

export async function failedOrders(): Promise<PendingOrder[]> {
  const database = await db();
  return database.getAll(DEAD_LETTER);
}

export async function clearFailed(): Promise<void> {
  const database = await db();
  await database.clear(DEAD_LETTER);
}

/**
 * Pushes everything queued. Called on reconnect and after each sale.
 *
 * Orders go in the order they were rung, one at a time — a busy shift's queue
 * replayed in parallel would land call numbers out of sequence.
 */
export async function syncPending(): Promise<SyncResult> {
  const database = await db();
  const queued = (await database.getAll(STORE)) as PendingOrder[];
  const result: SyncResult = { synced: 0, failed: 0, deadLettered: 0, authFailed: false };

  for (const order of queued.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      const response = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order.payload),
      });

      if (response.ok) {
        await database.delete(STORE, order.clientRef);
        result.synced++;
        continue;
      }

      if (response.status === 401) {
        // Everything else will fail the same way. Stop and tell the cashier.
        result.authFailed = true;
        result.failed++;
        break;
      }

      const body = await response.json().catch(() => ({}));
      const attempts = order.attempts + 1;

      if (PERMANENT_FAILURES.has(response.status) || attempts >= MAX_ATTEMPTS) {
        await database.put(DEAD_LETTER, {
          ...order,
          attempts,
          lastError: body.error ?? `HTTP ${response.status}`,
        });
        await database.delete(STORE, order.clientRef);
        result.deadLettered++;
      } else {
        await database.put(STORE, {
          ...order,
          attempts,
          lastError: body.error ?? `HTTP ${response.status}`,
        });
        result.failed++;
      }
    } catch {
      // Still offline. Leave it queued, count the attempt.
      const attempts = order.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await database.put(DEAD_LETTER, { ...order, attempts, lastError: "No connection" });
        await database.delete(STORE, order.clientRef);
        result.deadLettered++;
      } else {
        await database.put(STORE, { ...order, attempts, lastError: "No connection" });
        result.failed++;
      }
    }
  }

  await refreshQueueCount();
  return result;
}

/** Starts syncing whenever the browser regains a connection. */
export function onReconnect(handler: (result: SyncResult) => void): () => void {
  const run = () => {
    void syncPending().then(handler);
  };
  window.addEventListener("online", run);
  return () => window.removeEventListener("online", run);
}

// ---------------------------------------------------------------------------
// Queue-size store
// ---------------------------------------------------------------------------
/**
 * The number of sales waiting to send is external state — it lives in
 * IndexedDB, not in React. Exposing it as a subscribable store lets the till
 * read it with useSyncExternalStore instead of fetching it in an effect and
 * calling setState, which is the pattern React 19 rightly warns about.
 */

let cachedCount = 0;
const listeners = new Set<() => void>();

function publish(next: number) {
  if (next === cachedCount) return;
  cachedCount = next;
  for (const listener of listeners) listener();
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  // First subscriber kicks off a read; later ones reuse the cached value.
  void pendingCount()
    .then(publish)
    .catch(() => {
      /* IndexedDB blocked (private browsing). Zero is the honest answer. */
    });
  return () => listeners.delete(listener);
}

export function getQueueCount(): number {
  return cachedCount;
}

/** Server render has no IndexedDB; nothing can be queued there. */
export function getServerQueueCount(): number {
  return 0;
}

/** Re-reads the queue and notifies subscribers. */
export async function refreshQueueCount(): Promise<void> {
  try {
    publish(await pendingCount());
  } catch {
    /* Ignore: the till works without the badge. */
  }
}
