import { prisma } from "@/lib/db";
import { toMoney, roundMoney, formatGHS } from "@/lib/money";
import { PageHeader, Panel, EmptyState } from "@/components/admin/ui";
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
      status: { not: "CANCELLED" },
      OR: [{ customerName: { not: null } }, { customerPhone: { not: null } }],
      ...(query
        ? {
            OR: [
              { customerName: { contains: query, mode: "insensitive" } },
              { customerPhone: { contains: query } },
            ],
          }
        : {}),
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
    { name: string; phone: string | null; orders: number; spent: number; last: Date }
  >();
  for (const order of orders) {
    const key = order.customerPhone || order.customerName!.toLowerCase();
    const existing = map.get(key);
    const paid = order.paymentStatus === "PAID" ? toMoney(order.total) : 0;
    if (existing) {
      existing.orders += 1;
      existing.spent = roundMoney(existing.spent + paid);
      if (order.createdAt > existing.last) existing.last = order.createdAt;
      if (!existing.name && order.customerName) existing.name = order.customerName;
    } else {
      map.set(key, {
        name: order.customerName ?? "No name",
        phone: order.customerPhone,
        orders: 1,
        spent: paid,
        last: order.createdAt,
      });
    }
  }

  const customers = [...map.values()].sort((a, b) => b.last.getTime() - a.last.getTime());

  return (
    <>
      <PageHeader title="Customers" description="Everyone who has given a name or number at the till." />
      <CustomerSearch initial={query} />

      <Panel>
        {customers.length === 0 ? (
          <EmptyState
            title={query ? "No one matches" : "No named customers yet"}
            hint={query ? "Try a different name or number." : "Names captured at the till show up here."}
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
            {customers.map((customer, index) => (
              <li key={index} className="px-4 py-3 sm:px-5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  {customer.phone && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-xs"
                      style={{ color: "var(--s-brand)" }}
                    >
                      {customer.phone}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="money text-sm font-semibold">{formatGHS(customer.spent)}</p>
                  <p className="text-xs" style={{ color: "var(--s-ink-faint)" }}>
                    {customer.orders} order{customer.orders === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
