import { prisma } from "@/lib/db";
import { toMoney, roundMoney, formatGHS } from "@/lib/money";
import Link from "next/link";
import { PageHeader, Panel, EmptyState } from "@/components/admin/ui";
import { addDays } from "@/lib/period";
import { businessDay } from "@/lib/session-utils";
import CustomerSearch from "./CustomerSearch";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

/**
 * Customers, built from the orders that captured a name or phone.
 *
 * There is no separate sign-up: a customer exists because they ordered and
 * someone wrote down who they were. Aggregating the orders is both simpler and
 * more honest than a parallel table that could drift from what was actually sold.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const orders = await prisma.order.findMany({
    where: {
      isDemo: false,
      status: { not: "CANCELLED" },
      AND: [
        { OR: [{ customerName: { not: null } }, { customerPhone: { not: null } }] },
        ...(query
          ? [
              {
                OR: [
                  { customerName: { contains: query, mode: "insensitive" as const } },
                  { customerPhone: { contains: query.replace(/\s+/g, "") } },
                ],
              },
            ]
          : []),
      ],
    },
    select: {
      customerName: true,
      customerPhone: true,
      total: true,
      createdAt: true,
      paymentStatus: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  // Group by phone where present, else by lower-cased name.
  const map = new Map<
    string,
    { name: string; phone: string | null; orders: number; spent: number; first: Date; last: Date }
  >();
  for (const order of orders) {
    const phone = order.customerPhone?.trim() || null;
    const name = order.customerName?.trim() || null;
    // A blank name and blank phone tell us nothing about who it was.
    if (!phone && !name) continue;
    const key = phone ?? `name:${name!.toLowerCase()}`;
    const existing = map.get(key);
    const paid = order.paymentStatus === "PAID" ? toMoney(order.total) : 0;
    if (existing) {
      existing.orders += 1;
      existing.spent = roundMoney(existing.spent + paid);
      if (order.createdAt > existing.last) existing.last = order.createdAt;
      if (order.createdAt < existing.first) existing.first = order.createdAt;
      if (existing.name === "No name" && name) existing.name = name;
    } else {
      map.set(key, {
        name: name ?? "No name",
        phone,
        orders: 1,
        spent: paid,
        first: order.createdAt,
        last: order.createdAt,
      });
    }
  }

  const customers = [...map.values()].sort((a, b) => b.last.getTime() - a.last.getTime());

  return (
    <>
      <PageHeader eyebrow="Shop" title="Customers" description="Everyone who gave a name or number, at the till or online. Tap someone to see their orders." />
      <CustomerSearch initial={query} />

      <Panel>
        {customers.length === 0 ? (
          <EmptyState
            title={query ? "No one matches" : "No named customers yet"}
            hint={query ? "Try a different name or number." : "Names captured at the till show up here."}
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {customers.map((customer) => {
              // Their orders, over the span they have been ordering (a year at most).
              const to = businessDay(customer.last);
              const earliest = addDays(to, -365);
              const first = businessDay(customer.first);
              const from = first > earliest ? first : earliest;
              const href = `/admin/orders?q=${encodeURIComponent(customer.phone ?? customer.name)}&from=${from}&to=${to}`;
              return (
                <li key={customer.phone ?? customer.name} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Link href={href} className="min-w-0 flex-1" aria-label={`Orders from ${customer.name}`}>
                    <p className="truncate text-sm font-medium">{customer.name}</p>
                    <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      {customer.phone ? `${customer.phone} · ` : ""}last order {customer.last.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </Link>
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="text-xs font-semibold" style={{ color: "var(--s-brand)" }}>
                      Call
                    </a>
                  )}
                  <Link href={href} className="text-right">
                    <p className="money text-sm font-semibold">{formatGHS(customer.spent)}</p>
                    <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                      {customer.orders} order{customer.orders === 1 ? "" : "s"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
