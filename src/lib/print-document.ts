/** Print an HTML document in its own frame, so its page size does not fight the till slip. */
export function printHtmlDocument(html: string): void {
  if (typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => window.setTimeout(() => iframe.remove(), 400);
  win.onafterprint = cleanup;
  window.setTimeout(() => {
    win.focus();
    win.print();
    window.setTimeout(cleanup, 1500);
  }, 40);
}
