/**
 * Fire `window.print()` for the thermal slip, and only that slip.
 *
 * The receipt lives inside a tall, scrollable till. Printing the page as-is
 * makes the browser paginate the hidden menu into blank sheets after the slip
 * (Safari's "Page 1 of 3"). A copy is parked on `document.body` and the print
 * stylesheet hides every other top-level node, so the roll is one short page.
 *
 * Images are waited on first. The QR is an inline data URL and the logo is a
 * file; either one that has not decoded yet prints as a blank box.
 */
export function printReceiptNow(waitMs = 300): void {
  if (typeof window === "undefined") return;

  const root = document.querySelector<HTMLElement>("[data-anis-receipt]");
  if (!root) {
    window.print();
    return;
  }

  document.querySelector("[data-print-slip]")?.remove();

  const host = document.createElement("div");
  host.setAttribute("data-print-slip", "");
  host.setAttribute("aria-hidden", "true");
  const clone = root.cloneNode(true) as HTMLElement;
  clone.classList.remove("anis-receipt--preview");
  host.appendChild(clone);
  document.body.appendChild(host);

  const cleanup = () => {
    host.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  const images = Array.from(clone.querySelectorAll("img"));
  const pending = images.filter((img) => !img.complete);
  let printed = false;
  const finish = () => {
    if (printed) return;
    printed = true;
    window.print();
  };

  if (pending.length === 0) {
    finish();
    return;
  }

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
