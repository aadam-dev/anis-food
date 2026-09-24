"use client";

import { useCallback, useRef, useState } from "react";

/**
 * One way to call the till's API.
 *
 * Every mutating call gets a busy flag that is always released, a lock against
 * a second tap while the first is in flight, and an error message in words a
 * cashier can act on — so no button is ever stuck spinning.
 */
export class PosRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export async function posRequest<T = Record<string, unknown>>(
  path: string,
  method: "POST" | "PATCH" | "DELETE" | "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PosRequestError("No connection. Check the network and try again.", 0);
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: unknown };
  if (response.status === 401) {
    throw new PosRequestError("You have been signed out. Sign in again to carry on.", 401);
  }
  if (!response.ok) {
    throw new PosRequestError(data.error ?? "That did not work. Try again.", response.status, data.detail);
  }
  return data;
}

export function usePosAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not work. Try again.");
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);

  return { run, busy, error, setError };
}
