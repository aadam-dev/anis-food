import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldQuestion } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatGHS, toMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { VERIFY_CREDIT } from "@/lib/developer-credit";

/**
 * Public receipt verification.
 *
 * Reached only by scanning the QR on a printed slip. The token is the order's
 * clientRef — an unguessable UUID already unique on every order — so no separate
 * token column is needed. The page is noindex and disallowed in robots: it
 * exists for the person holding the paper, not for search engines.
 */

export const metadata: Metadata = {
  title: "Verify receipt — Anis Food and Drink",
  robots: { index: false, follow: false },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  MOMO: "Mobile Money",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  BOLT_FOOD: "Bolt Food",
  SPLIT: "Split",
  UNPAID: "Not yet paid",
};

interface TaxSnapshot {
  inclusive: boolean;
  net: number;
  taxTotal: number;
  lines: { code: string; label: string; rate: number; amount: number }[];
}

export default async function ReceiptVerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const order = await prisma.order
    .findUnique({
      where: { clientRef: token },
      include: { items: true },
    })
    .catch(() => null);

  if (!order) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldQuestion className="mx-auto h-12 w-12" style={{ color: "var(--color-ink-muted, #6b7280)" }} />
        <h1 className="mt-4 text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          Receipt not found
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          This code doesn&apos;t match a sale on record. If you scanned it from a printed
          receipt, check with the counter.
        </p>
      </main>
    );
  }

  const settings = await getSettings();
  const snapshot = order.transactionSnapshot as { tax?: TaxSnapshot | null } | null;
  const tax = snapshot?.tax ?? null;

  const when = new Date(order.createdAt).toLocaleString("en-GB", {
    timeZone: "Africa/Accra",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div
        className="rounded-2xl border bg-white p-6 shadow-sm"
        style={{ borderColor: "rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold">Verified sale</span>
        </div>

        <div className="mt-4 text-center">
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {settings.business_name}
          </h1>
          <p className="text-xs text-neutral-500">{settings.business_address}</p>
          <p className="text-xs text-neutral-500">{settings.business_phone}</p>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-neutral-500">Order</span>
          <span className="font-mono font-semibold">{order.orderNumber}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">Date</span>
          <span>{when}</span>
        </div>

        <div className="my-4 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }} />

        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">{item.quantity}×</span> {item.name}
              </span>
              <span className="font-mono whitespace-nowrap">{formatGHS(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="my-4 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }} />

        {toMoney(order.discountAmount) > 0 && (
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>Discount</span>
            <span className="font-mono">-{formatGHS(order.discountAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="font-mono">{formatGHS(order.total)}</span>
        </div>

        <div className="mt-1 flex items-center justify-between text-sm text-neutral-500">
          <span>Paid by</span>
          <span>{METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
        </div>

        {tax && tax.lines.length > 0 && (
          <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
            <p className="mb-1 font-medium text-neutral-700">Included in the price</p>
            <div className="flex items-center justify-between">
              <span>Taxable (excl.)</span>
              <span className="font-mono">{formatGHS(tax.net)}</span>
            </div>
            {tax.lines.map((line) => (
              <div key={line.code} className="flex items-center justify-between">
                <span>{line.label}</span>
                <span className="font-mono">{formatGHS(line.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-neutral-400">
        {VERIFY_CREDIT.label} ·{" "}
        <a
          href={VERIFY_CREDIT.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {VERIFY_CREDIT.site}
        </a>
      </p>
    </main>
  );
}
