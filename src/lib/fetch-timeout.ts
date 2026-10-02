/**
 * fetch with a hard ceiling so a hung network never leaves the till spinning
 * "Processing…" forever. AbortError is rethrown as a plain Error the sheets
 * already know how to show.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("That took too long. Check the network and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
