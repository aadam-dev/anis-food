/**
 * Fire `window.print()`, but only once the receipt's images have actually
 * decoded.
 *
 * The 80mm slip now carries a verification QR rendered as an inline `data:` URL.
 * A data URL needs no network and decodes in single-digit milliseconds, but an
 * `<img>` that has not decoded yet prints as a blank box — so we wait for every
 * image inside the receipt (logo + QR) to settle before printing.
 *
 * `waitMs` is a ceiling, not a delay: whichever of load / error / decode /
 * timeout lands first for the last straggler wins, and a receipt whose images
 * are already complete prints synchronously.
 */
export function printReceiptNow(waitMs = 300): void {
  if (typeof window === "undefined") return;

  const root = document.querySelector<HTMLElement>("[data-anis-receipt]");
  const images = Array.from(root?.querySelectorAll<HTMLImageElement>("img") ?? []);
  const pending = images.filter((img) => !img.complete);

  if (pending.length === 0) {
    window.print();
    return;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.print();
  };

  // Print once the LAST image settles. Each image is counted at most once: a
  // cached image can fire `load` and resolve `decode()` both, which would
  // otherwise decrement twice and print while the other was still blank.
  let remaining = pending.length;
  for (const img of pending) {
    let counted = false;
    const settleOne = () => {
      if (counted) return;
      counted = true;
      remaining -= 1;
      if (remaining <= 0) finish();
    };
    img.addEventListener("load", settleOne, { once: true });
    img.addEventListener("error", settleOne, { once: true });
    void img.decode().then(settleOne).catch(settleOne);
  }
  window.setTimeout(finish, waitMs);
}
